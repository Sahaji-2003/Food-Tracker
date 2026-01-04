from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from datetime import date
from typing import Optional
from services.auth import get_user_id
from services.supabase_client import get_supabase
from services.gemini import analyze_meal_image, analyze_meal_text
from models import MealAnalysisRequest
import uuid

router = APIRouter()


@router.post("/analyze")
async def analyze_meal(
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id)
):
    """Analyze a meal from an uploaded image with personalized context."""
    try:
        print(f"[DEBUG] Starting meal analysis for user: {user_id}")
        print(f"[DEBUG] File received: {file.filename}, content_type: {file.content_type}")
        
        supabase = get_supabase()
        
        # Get user profile for personalized analysis
        profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        user_profile = profile_result.data if profile_result.data else {}
        print(f"[DEBUG] User profile: {user_profile}")
        
        # Get today's calorie consumption
        target_date = date.today().isoformat()
        daily_log = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", target_date)\
            .single()\
            .execute()
        calories_consumed = daily_log.data.get("calories_in", 0) if daily_log.data else 0
        print(f"[DEBUG] Calories consumed today: {calories_consumed}")
        
        # Read image data
        image_data = await file.read()
        print(f"[DEBUG] Image data read, size: {len(image_data)} bytes")
        
        # Analyze with Gemini (personalized)
        print("[DEBUG] Calling Gemini API with user profile...")
        analysis = await analyze_meal_image(image_data, user_profile, calories_consumed)
        print(f"[DEBUG] Gemini analysis complete")
        
        # Handle new response format (total_calories vs calories)
        total_calories = analysis.get("total_calories", analysis.get("calories", 0))
        
        # Save meal to history
        meal_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "food_name": analysis.get("food", "Unknown Food"),
            "image_description": analysis.get("image_description", ""),
            "ingredients": analysis.get("ingredients", ""),
            "calories": total_calories,
            "macros": analysis.get("macros", {"p": 0, "c": 0, "f": 0}),
            "plate_grade": analysis.get("plate_grade", "C"),
            "reasoning": analysis.get("reasoning", ""),
            "source": "photo"
        }
        
        print(f"[DEBUG] Saving meal to history")
        supabase.table("meal_history").insert(meal_record).execute()
        print("[DEBUG] Meal saved to history successfully")
        
        # Update daily calorie count
        if daily_log.data:
            new_calories = daily_log.data["calories_in"] + total_calories
            supabase.table("daily_logs")\
                .update({"calories_in": new_calories})\
                .eq("id", daily_log.data["id"])\
                .execute()
        else:
            # Create new daily log
            supabase.table("daily_logs").insert({
                "user_id": user_id,
                "date": target_date,
                "calories_in": total_calories,
                "calories_out": 0,
                "water_ml": 0,
                "steps": 0,
                "active_minutes": 0
            }).execute()
        
        # Create burn tasks (multiple tasks from new format)
        tasks = analysis.get("tasks", [])
        created_tasks = []
        for task_data in tasks:
            if task_data.get("calories_to_burn", 0) > 0:
                burn_task = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "meal_id": meal_record["id"],
                    "task_type": task_data.get("type", "walking"),
                    "name": task_data.get("name", "Burn calories"),
                    "description": task_data.get("description", ""),
                    "duration_minutes": task_data.get("duration_minutes", 30),
                    "calories_to_burn": task_data.get("calories_to_burn", 0),
                    "distance_km": task_data.get("distance_km"),
                    "steps": task_data.get("steps"),
                    "status": "pending",
                    "date": target_date
                }
                supabase.table("burn_tasks").insert(burn_task).execute()
                created_tasks.append(burn_task)
                print(f"[DEBUG] Created burn task: {burn_task['name']}")
        
        return {
            **analysis,
            "meal_id": meal_record["id"],
            "created_tasks": created_tasks
        }
        
    except Exception as e:
        print(f"[ERROR] Meal analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-text")
async def analyze_meal_from_text(
    request: MealAnalysisRequest,
    user_id: str = Depends(get_user_id)
):
    """Analyze a meal from text description."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text description is required")
    
    try:
        # Analyze with Gemini
        analysis = await analyze_meal_text(request.text)
        
        supabase = get_supabase()
        
        # Save meal to history
        meal_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "food_name": analysis.get("food", request.text),
            "ingredients": analysis.get("ingredients", ""),
            "calories": analysis.get("calories", 0),
            "macros": analysis.get("macros", {"p": 0, "c": 0, "f": 0}),
            "plate_grade": analysis.get("plate_grade", "C"),
            "reasoning": analysis.get("reasoning", ""),
            "source": "text"
        }
        
        supabase.table("meal_history").insert(meal_record).execute()
        
        # Update daily calorie count
        target_date = date.today().isoformat()
        try:
            daily_log = supabase.table("daily_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("date", target_date)\
                .single()\
                .execute()
            
            if daily_log.data:
                new_calories = daily_log.data["calories_in"] + analysis.get("calories", 0)
                supabase.table("daily_logs")\
                    .update({"calories_in": new_calories})\
                    .eq("id", daily_log.data["id"])\
                    .execute()
        except:
            supabase.table("daily_logs").insert({
                "user_id": user_id,
                "date": target_date,
                "calories_in": analysis.get("calories", 0),
                "calories_out": 0,
                "water_ml": 0,
                "steps": 0,
                "active_minutes": 0
            }).execute()
        
        return {
            **analysis,
            "meal_id": meal_record["id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_meal_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    today_only: bool = Query(True, description="Only show today and yesterday's meals"),
    user_id: str = Depends(get_user_id)
):
    """Get meal history for the user."""
    supabase = get_supabase()
    
    try:
        from datetime import timedelta
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        query = supabase.table("meal_history")\
            .select("*")\
            .eq("user_id", user_id)
        
        if today_only:
            query = query.gte("created_at", yesterday.isoformat())
        
        result = query\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {
            "meals": result.data or [],
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# IMPORTANT: /tasks routes MUST be defined BEFORE /{meal_id} to avoid route collision
@router.get("/tasks")
async def get_tasks(
    user_id: str = Depends(get_user_id),
    status: Optional[str] = Query(None, description="Filter by status: pending, completed, or None for both"),
    include_yesterday: bool = Query(True, description="Include yesterday's pending tasks")
):
    """Get user's burn tasks - pending from today/yesterday, completed from today only."""
    print(f"[DEBUG] get_tasks called for user_id: {user_id}, status: {status}")
    
    try:
        supabase = get_supabase()
        from datetime import timedelta
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        all_tasks = []
        
        # Get pending tasks (today and yesterday)
        if status is None or status == "pending":
            pending_query = supabase.table("burn_tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("status", "pending")\
                .gte("created_at", yesterday.isoformat())
            
            pending_result = pending_query.order("created_at", desc=True).execute()
            all_tasks.extend(pending_result.data or [])
        
        # Get completed tasks (today only)
        if status is None or status == "completed":
            completed_query = supabase.table("burn_tasks")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("status", "completed")\
                .gte("created_at", today.isoformat())
            
            completed_result = completed_query.order("created_at", desc=True).execute()
            all_tasks.extend(completed_result.data or [])
        
        print(f"[DEBUG] Query result: {len(all_tasks)} tasks found")
        return {"tasks": all_tasks}
        
    except Exception as e:
        print(f"[ERROR] get_tasks failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"tasks": []}


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a burn task."""
    supabase = get_supabase()
    
    try:
        task = supabase.table("burn_tasks")\
            .select("*")\
            .eq("id", task_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not task.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        supabase.table("burn_tasks")\
            .delete()\
            .eq("id", task_id)\
            .execute()
        
        return {"message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    status: str = Query(..., description="New status: pending, completed"),
    user_id: str = Depends(get_user_id)
):
    """Update a burn task status and update calories if completed."""
    supabase = get_supabase()
    
    try:
        # Get task first to check current status and calories
        task = supabase.table("burn_tasks")\
            .select("*")\
            .eq("id", task_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not task.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        old_status = task.data.get("status", "pending")
        calories_to_burn = task.data.get("calories_to_burn", 0)
        
        # Update task status
        supabase.table("burn_tasks")\
            .update({"status": status, "completed_at": date.today().isoformat() if status == "completed" else None})\
            .eq("id", task_id)\
            .execute()
        
        # Update daily log calories_out based on status change
        if old_status != status:
            today = date.today()
            daily_log = supabase.table("daily_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("date", today.isoformat())\
                .single()\
                .execute()
            
            if daily_log.data:
                current_out = daily_log.data.get("calories_out", 0) or 0
                
                if status == "completed" and old_status != "completed":
                    new_out = current_out + calories_to_burn
                elif status != "completed" and old_status == "completed":
                    new_out = max(0, current_out - calories_to_burn)
                else:
                    new_out = current_out
                
                supabase.table("daily_logs")\
                    .update({"calories_out": new_out})\
                    .eq("id", daily_log.data["id"])\
                    .execute()
        
        return {"message": "Task updated successfully", "status": status}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Dynamic routes with path parameters MUST come after static routes
@router.get("/{meal_id}")
async def get_meal_detail(
    meal_id: str,
    user_id: str = Depends(get_user_id)
):
    """Get detailed information about a specific meal including its tasks."""
    supabase = get_supabase()
    
    try:
        # Get meal
        meal = supabase.table("meal_history")\
            .select("*")\
            .eq("id", meal_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not meal.data:
            raise HTTPException(status_code=404, detail="Meal not found")
        
        # Get associated tasks
        tasks = supabase.table("burn_tasks")\
            .select("*")\
            .eq("meal_id", meal_id)\
            .execute()
        
        return {
            **meal.data,
            "tasks": tasks.data or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{meal_id}")
async def delete_meal(
    meal_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a meal and its associated tasks, and update daily calories."""
    supabase = get_supabase()
    
    try:
        # Verify ownership and get meal data
        meal = supabase.table("meal_history")\
            .select("*")\
            .eq("id", meal_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not meal.data:
            raise HTTPException(status_code=404, detail="Meal not found")
        
        meal_calories = meal.data.get("calories", 0)
        meal_created_at = meal.data.get("created_at", "")
        meal_date = meal_created_at[:10] if meal_created_at else date.today().isoformat()
        
        # Subtract calories from daily log
        daily_log = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", meal_date)\
            .single()\
            .execute()
        
        if daily_log.data:
            new_calories = max(0, daily_log.data["calories_in"] - meal_calories)
            supabase.table("daily_logs")\
                .update({"calories_in": new_calories})\
                .eq("id", daily_log.data["id"])\
                .execute()
        
        # Delete associated tasks
        supabase.table("burn_tasks")\
            .delete()\
            .eq("meal_id", meal_id)\
            .execute()
        
        # Delete meal
        supabase.table("meal_history")\
            .delete()\
            .eq("id", meal_id)\
            .execute()
        
        return {"message": "Meal deleted successfully", "calories_removed": meal_calories}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
