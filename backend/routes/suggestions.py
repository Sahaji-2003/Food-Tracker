from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from services.auth import get_user_id
from services.supabase_client import get_supabase
from services.gemini import analyze_menu, analyze_pantry
from datetime import date

router = APIRouter()


@router.post("/menu")
async def suggest_from_menu(
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id)
):
    """Suggest healthy options from a restaurant menu image."""
    try:
        image_data = await file.read()
        
        # Get user profile for personalization
        supabase = get_supabase()
        profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        profile = profile_result.data or {}
        
        # Get today's calorie intake to calculate remaining budget
        target_date = date.today().isoformat()
        daily_result = supabase.table("daily_logs")\
            .select("calories_in")\
            .eq("user_id", user_id)\
            .eq("date", target_date)\
            .single()\
            .execute()
        
        calories_in = daily_result.data.get("calories_in", 0) if daily_result.data else 0
        calorie_target = profile.get("daily_calorie_target", 2000)
        calories_remaining = calorie_target - calories_in
        
        # Analyze menu with Gemini
        result = await analyze_menu(
            image_data=image_data,
            allergies=profile.get("allergies", []),
            conditions=profile.get("medical_conditions", []),
            preferences=profile.get("preferences", []),
            calories_remaining=max(0, calories_remaining)
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cooking")
async def suggest_cooking(
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id)
):
    """Suggest healthy recipes from a fridge/pantry image."""
    try:
        image_data = await file.read()
        
        # Get user profile for personalization
        supabase = get_supabase()
        profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        profile = profile_result.data or {}
        
        # Analyze pantry with Gemini
        result = await analyze_pantry(
            image_data=image_data,
            allergies=profile.get("allergies", []),
            conditions=profile.get("medical_conditions", []),
            preferences=profile.get("preferences", [])
        )
        
        # Add missing ingredients to grocery list
        if result.get("missing_ingredients"):
            for item in result["missing_ingredients"]:
                try:
                    supabase.table("grocery_items").insert({
                        "user_id": user_id,
                        "item_name": item,
                        "suggested_by_ai": True,
                        "recipe_context": "Suggested for healthy recipes",
                        "is_purchased": False
                    }).execute()
                except:
                    pass  # Ignore duplicates
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
