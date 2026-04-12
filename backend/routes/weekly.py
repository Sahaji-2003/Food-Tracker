from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from services.auth import get_user_id
from services.supabase_client import get_supabase

router = APIRouter()


@router.get("/summary")
async def get_weekly_summary(user_id: str = Depends(get_user_id)):
    """Get weekly summary of calories, steps, etc."""
    supabase = get_supabase()
    
    # Get last 7 days dates
    today = date.today()
    seven_days_ago = today - timedelta(days=6)
    
    try:
        # Fetch daily logs for last 7 days
        result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("date", seven_days_ago.isoformat())\
            .lte("date", today.isoformat())\
            .order("date")\
            .execute()
        
        daily_data = []
        total_calories_in = 0
        total_calories_out = 0
        total_steps = 0
        
        # Create a map of existing data
        data_map = {}
        if result.data:
            for record in result.data:
                data_map[record["date"]] = record
        
        # Fill in all 7 days (including missing ones)
        for i in range(7):
            day = seven_days_ago + timedelta(days=i)
            day_str = day.isoformat()
            day_name = day.strftime("%a")
            
            if day_str in data_map:
                record = data_map[day_str]
                cal_in = record.get("calories_in", 0) or 0
                cal_out = record.get("calories_out", 0) or 0
                steps = record.get("steps", 0) or 0
            else:
                cal_in = 0
                cal_out = 0
                steps = 0
            
            total_calories_in += cal_in
            total_calories_out += cal_out
            total_steps += steps
            
            daily_data.append({
                "date": day_str,
                "day": day_name,
                "calories_in": cal_in,
                "calories_out": cal_out,
                "steps": steps,
            })
        
        return {
            "success": True,
            "data": {
                "total_calories_in": total_calories_in,
                "total_calories_out": total_calories_out,
                "total_steps": total_steps,
                "average_calories_in": round(total_calories_in / 7),
                "average_calories_out": round(total_calories_out / 7),
                "average_steps": round(total_steps / 7),
                "daily_data": daily_data,
                "date_range": {
                    "start": seven_days_ago.isoformat(),
                    "end": today.isoformat(),
                }
            }
        }
        
    except Exception as e:
        print(f"Error fetching weekly summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_old_data(user_id: str = Depends(get_user_id)):
    """
    Delete data older than 7 days for the user.
    Should be called once per day on first app open.
    """
    supabase = get_supabase()
    
    cutoff_date = (date.today() - timedelta(days=7)).isoformat()
    
    print(f"\n{'='*50}")
    print(f"🧹 CLEANUP: Deleting data before {cutoff_date}")
    print(f"User: {user_id}")
    print(f"{'='*50}\n")
    
    deleted_counts = {
        "daily_logs": 0,
        "meal_history": 0,
        "chat_messages": 0,
    }
    
    try:
        # Delete old daily logs
        try:
            daily_result = supabase.table("daily_logs")\
                .delete()\
                .eq("user_id", user_id)\
                .lt("date", cutoff_date)\
                .execute()
            
            deleted_counts["daily_logs"] = len(daily_result.data) if daily_result.data else 0
            print(f"Deleted {deleted_counts['daily_logs']} old daily_logs")
        except Exception as e:
            print(f"Warning: Could not delete daily_logs: {e}")
        
        # Delete old meals (based on created_at date)
        try:
            meals_result = supabase.table("meal_history")\
                .delete()\
                .eq("user_id", user_id)\
                .lt("created_at", f"{cutoff_date}T00:00:00")\
                .execute()
            
            deleted_counts["meal_history"] = len(meals_result.data) if meals_result.data else 0
            print(f"Deleted {deleted_counts['meal_history']} old meal_history records")
        except Exception as e:
            print(f"Warning: Could not delete meal_history: {e}")
        
        # Delete old chat messages (based on created_at date)
        try:
            chat_result = supabase.table("chat_messages")\
                .delete()\
                .eq("user_id", user_id)\
                .lt("created_at", f"{cutoff_date}T00:00:00")\
                .execute()
            
            deleted_counts["chat_messages"] = len(chat_result.data) if chat_result.data else 0
            print(f"Deleted {deleted_counts['chat_messages']} old chat_messages")
        except Exception as e:
            print(f"Warning: Could not delete chat_messages: {e}")
        
        print(f"\n✅ Cleanup complete!")
        
        return {
            "success": True,
            "message": f"Cleanup complete. Deleted data before {cutoff_date}",
            "deleted": deleted_counts,
            "cutoff_date": cutoff_date,
        }
        
    except Exception as e:
        print(f"❌ Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-cleanup")
async def check_cleanup_needed(
    last_cleanup_date: Optional[str] = None,
    user_id: str = Depends(get_user_id)
):
    """
    Check if cleanup is needed (if last cleanup was before today).
    Returns whether cleanup should be run.
    """
    today = date.today().isoformat()
    
    if not last_cleanup_date:
        return {
            "needs_cleanup": True,
            "reason": "No previous cleanup date",
            "today": today,
        }
    
    if last_cleanup_date < today:
        return {
            "needs_cleanup": True,
            "reason": f"Last cleanup was {last_cleanup_date}",
            "today": today,
        }
    
    return {
        "needs_cleanup": False,
        "reason": "Already cleaned up today",
        "today": today,
    }
