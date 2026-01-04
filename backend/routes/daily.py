from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date, datetime
from typing import Optional
from services.auth import get_user_id
from services.supabase_client import get_supabase

router = APIRouter()


@router.get("")
async def get_daily_log(
    log_date: Optional[str] = Query(None, alias="date"),
    user_id: str = Depends(get_user_id)
):
    """Get daily log for a specific date (defaults to today)."""
    supabase = get_supabase()
    
    # Use today if no date provided
    target_date = log_date or date.today().isoformat()
    
    try:
        result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", target_date)\
            .single()\
            .execute()
        
        if result.data:
            return result.data
        
        # Create new daily log if not exists
        new_log = {
            "user_id": user_id,
            "date": target_date,
            "calories_in": 0,
            "calories_out": 0,
            "water_ml": 0,
            "steps": 0,
            "active_minutes": 0,
            "google_fit_data": {}
        }
        
        insert_result = supabase.table("daily_logs").insert(new_log).execute()
        
        if insert_result.data:
            return insert_result.data[0]
        
        return new_log
        
    except Exception as e:
        # If single() fails (no data), create new log
        if "No rows found" in str(e) or "0 rows" in str(e):
            new_log = {
                "user_id": user_id,
                "date": target_date,
                "calories_in": 0,
                "calories_out": 0,
                "water_ml": 0,
                "steps": 0,
                "active_minutes": 0,
                "google_fit_data": {}
            }
            
            try:
                insert_result = supabase.table("daily_logs").insert(new_log).execute()
                if insert_result.data:
                    return insert_result.data[0]
            except:
                pass
            
            return new_log
        
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-google-fit")
async def sync_google_fit(user_id: str = Depends(get_user_id)):
    """Sync data from Google Fit (placeholder - requires OAuth setup)."""
    # Note: Full Google Fit integration requires OAuth flow
    # This is a placeholder that returns current data
    
    supabase = get_supabase()
    target_date = date.today().isoformat()
    
    try:
        result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", target_date)\
            .single()\
            .execute()
        
        if result.data:
            return {
                "message": "Google Fit sync would happen here",
                "current_data": result.data
            }
        
        return {
            "message": "No daily log found",
            "sync_status": "pending"
        }
        
    except Exception as e:
        return {
            "message": "Google Fit sync placeholder",
            "error": str(e)
        }


@router.post("/water")
async def add_water(
    ml: int = 250,
    user_id: str = Depends(get_user_id)
):
    """Add water intake."""
    supabase = get_supabase()
    target_date = date.today().isoformat()
    
    try:
        # Get current log
        result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", target_date)\
            .single()\
            .execute()
        
        if result.data:
            new_water = result.data["water_ml"] + ml
            update_result = supabase.table("daily_logs")\
                .update({"water_ml": new_water})\
                .eq("id", result.data["id"])\
                .execute()
            
            if update_result.data:
                return update_result.data[0]
        
        # Create new log with water
        new_log = {
            "user_id": user_id,
            "date": target_date,
            "calories_in": 0,
            "calories_out": 0,
            "water_ml": ml,
            "steps": 0,
            "active_minutes": 0
        }
        
        insert_result = supabase.table("daily_logs").insert(new_log).execute()
        return insert_result.data[0] if insert_result.data else new_log
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
