from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_user_id
from services.supabase_client import get_supabase
from services.langchain_chat import chat_with_context
from models import ChatRequest, ChatResponse
from datetime import date, timedelta
import uuid

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chat_with_buddy(
    request: ChatRequest,
    user_id: str = Depends(get_user_id)
):
    """Chat with Fit Buddy AI using LangChain with full context."""
    try:
        supabase = get_supabase()
        
        # 1. Get user profile
        profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        profile = profile_result.data or {}
        
        # 2. Get today's daily log
        target_date = date.today().isoformat()
        try:
            daily_result = supabase.table("daily_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("date", target_date)\
                .single()\
                .execute()
            daily_log = daily_result.data or {}
        except:
            daily_log = {
                "calories_in": 0,
                "calories_out": 0,
                "water_ml": 0,
                "steps": 0,
                "active_minutes": 0
            }
        
        # 3. Get last 3 days of meals
        three_days_ago = (date.today() - timedelta(days=3)).isoformat()
        meals_result = supabase.table("meal_history")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("created_at", three_days_ago)\
            .order("created_at", desc=True)\
            .limit(15)\
            .execute()
        meals_history = meals_result.data or []
        
        # 4. Get last 10 messages from chat history
        try:
            history_result = supabase.table("chat_messages")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(10)\
                .execute()
            # Reverse to get chronological order
            chat_history = list(reversed(history_result.data or []))
        except:
            chat_history = []
        
        # 5. Get AI response with full context
        response = await chat_with_context(
            message=request.message,
            user_profile=profile,
            meals_history=meals_history,
            daily_log=daily_log,
            chat_history=chat_history
        )
        
        # 6. Save user message to DB
        supabase.table("chat_messages").insert({
            "user_id": user_id,
            "role": "user",
            "content": request.message
        }).execute()
        
        # 7. Save AI response to DB
        supabase.table("chat_messages").insert({
            "user_id": user_id,
            "role": "assistant",
            "content": response
        }).execute()
        
        # 8. Cleanup old messages (keep only 20)
        try:
            all_msgs = supabase.table("chat_messages")\
                .select("id")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            
            if len(all_msgs.data or []) > 20:
                old_ids = [m["id"] for m in all_msgs.data[20:]]
                for old_id in old_ids:
                    supabase.table("chat_messages").delete().eq("id", old_id).execute()
        except:
            pass  # Cleanup is optional
        
        session_id = request.session_id or str(uuid.uuid4())
        
        return ChatResponse(
            response=response,
            session_id=session_id
        )
        
    except Exception as e:
        print(f"[ERROR] Chat failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_chat_history(
    user_id: str = Depends(get_user_id),
    limit: int = 20
):
    """Get chat history for the user."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("chat_messages")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        # Return in chronological order
        messages = list(reversed(result.data or []))
        return {"messages": messages}
        
    except Exception as e:
        return {"messages": []}


@router.delete("/history")
async def clear_chat_history(
    user_id: str = Depends(get_user_id)
):
    """Clear all chat history for the user."""
    try:
        supabase = get_supabase()
        supabase.table("chat_messages").delete().eq("user_id", user_id).execute()
        return {"message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import UploadFile, File, Form

@router.post("/vision", response_model=ChatResponse)
async def chat_with_vision(
    message: str = Form(""),
    image: UploadFile = File(...),
    user_id: str = Depends(get_user_id)
):
    """Chat with Fit Buddy AI with image analysis."""
    try:
        import google.generativeai as genai
        from config import settings
        
        supabase = get_supabase()
        
        # Get user profile
        profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        profile = profile_result.data or {}
        
        # Read image
        image_data = await image.read()
        
        # Configure Gemini vision
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        
        # Build prompt with context
        prompt = f"""You are Fit Buddy, a friendly AI health assistant.

User Profile:
- Goal: {profile.get('target_goal', 'General Health')}
- Calorie Target: {profile.get('daily_calorie_target', 2000)} cal
- Allergies: {', '.join(profile.get('allergies', [])) or 'None'}

User Message: {message or 'What can you tell me about this image?'}

Analyze this image in the context of health, nutrition, or fitness. Be helpful and conversational."""

        # Analyze with vision
        response = await model.generate_content_async([
            prompt,
            {"mime_type": image.content_type or "image/jpeg", "data": image_data}
        ])
        
        ai_response = response.text
        
        # Save messages to DB
        supabase.table("chat_messages").insert({
            "user_id": user_id,
            "role": "user",
            "content": f"📷 {message or 'Shared an image'}"
        }).execute()
        
        supabase.table("chat_messages").insert({
            "user_id": user_id,
            "role": "assistant",
            "content": ai_response
        }).execute()
        
        return ChatResponse(
            response=ai_response,
            session_id=str(uuid.uuid4())
        )
        
    except Exception as e:
        print(f"[ERROR] Vision chat failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
