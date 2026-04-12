from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from services.auth import get_user_id
from services.supabase_client import get_supabase

router = APIRouter()


class SyncDataEntry(BaseModel):
    steps: int = 0
    calories_burned: int = 0
    active_minutes: int = 0
    distance_km: float = 0.0
    synced_at: str = ""


class SyncRequest(BaseModel):
    steps: int = 0
    calories_burned: int = 0
    active_minutes: int = 0
    distance_km: float = 0.0


class ToggleSyncRequest(BaseModel):
    enabled: bool


@router.get("/status")
async def get_sync_status(user_id: str = Depends(get_user_id)):
    """Get Health Connect sync status for user."""
    supabase = get_supabase()
    
    try:
        result = supabase.table("google_fit_sync")\
            .select("*")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if result.data:
            return {
                "sync_enabled": result.data.get("sync_enabled", False),
                "last_sync_time": result.data.get("last_sync_time"),
                "sync_data": result.data.get("sync_data", []),
            }
        
        # No record exists, return default
        return {
            "sync_enabled": False,
            "last_sync_time": None,
            "sync_data": [],
        }
        
    except Exception as e:
        if "No rows found" in str(e) or "0 rows" in str(e):
            return {
                "sync_enabled": False,
                "last_sync_time": None,
                "sync_data": [],
            }
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/toggle")
async def toggle_sync(
    request: ToggleSyncRequest,
    user_id: str = Depends(get_user_id)
):
    """Enable or disable Health Connect sync."""
    supabase = get_supabase()
    
    try:
        # Check if record exists
        existing = supabase.table("google_fit_sync")\
            .select("id")\
            .eq("user_id", user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing record
            result = supabase.table("google_fit_sync")\
                .update({
                    "sync_enabled": request.enabled,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        else:
            # Create new record
            result = supabase.table("google_fit_sync")\
                .insert({
                    "user_id": user_id,
                    "sync_enabled": request.enabled,
                    "sync_data": [],
                })\
                .execute()
        
        return {
            "success": True,
            "sync_enabled": request.enabled
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_health_data(
    request: SyncRequest,
    user_id: str = Depends(get_user_id)
):
    """Sync health data from mobile device. Keeps last 3 entries."""
    supabase = get_supabase()
    
    # Log received data from mobile
    print("=" * 50)
    print("HEALTH CONNECT DATA RECEIVED FROM MOBILE")
    print("=" * 50)
    print(f"User ID: {user_id}")
    print(f"Steps: {request.steps}")
    print(f"Calories Burned: {request.calories_burned}")
    print(f"Active Minutes: {request.active_minutes}")
    print(f"Distance (km): {request.distance_km}")
    print(f"Full Request: {request.model_dump()}")
    print("=" * 50)
    
    new_entry = {
        "steps": request.steps,
        "calories_burned": request.calories_burned,
        "active_minutes": request.active_minutes,
        "distance_km": request.distance_km,
        "synced_at": datetime.utcnow().isoformat()
    }
    
    try:
        # Get existing record
        existing = supabase.table("google_fit_sync")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Get current sync_data and append new entry
            current_data = existing.data[0].get("sync_data", []) or []
            current_data.append(new_entry)
            
            # Keep only last 3 entries
            if len(current_data) > 3:
                current_data = current_data[-3:]
            
            result = supabase.table("google_fit_sync")\
                .update({
                    "sync_data": current_data,
                    "last_sync_time": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        else:
            # Create new record with this entry
            result = supabase.table("google_fit_sync")\
                .insert({
                    "user_id": user_id,
                    "sync_enabled": True,
                    "sync_data": [new_entry],
                    "last_sync_time": datetime.utcnow().isoformat()
                })\
                .execute()
        
        # Also update today's daily_log with the synced data
        from datetime import date
        today = date.today().isoformat()
        
        daily_result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", today)\
            .execute()
        
        if daily_result.data and len(daily_result.data) > 0:
            supabase.table("daily_logs")\
                .update({
                    "steps": request.steps,
                    "active_minutes": request.active_minutes,
                    "calories_out": request.calories_burned,
                    "google_fit_data": new_entry
                })\
                .eq("id", daily_result.data[0]["id"])\
                .execute()
        
        return {
            "success": True,
            "synced_data": new_entry,
            "message": "Health data synced successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
async def get_latest_sync(user_id: str = Depends(get_user_id)):
    """Get the most recent synced health data."""
    supabase = get_supabase()
    
    try:
        result = supabase.table("google_fit_sync")\
            .select("sync_data, last_sync_time")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if result.data:
            sync_data = result.data.get("sync_data", [])
            if sync_data and len(sync_data) > 0:
                return {
                    "latest": sync_data[-1],
                    "last_sync_time": result.data.get("last_sync_time"),
                    "total_entries": len(sync_data)
                }
        
        return {
            "latest": None,
            "last_sync_time": None,
            "total_entries": 0
        }
        
    except Exception as e:
        if "No rows found" in str(e) or "0 rows" in str(e):
            return {
                "latest": None,
                "last_sync_time": None,
                "total_entries": 0
            }
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-full")
async def sync_full_health_data(
    request: Dict[str, Any],
    user_id: str = Depends(get_user_id)
):
    """
    Receive ALL health data from Health Connect.
    Logs everything, then stores only what's needed.
    """
    supabase = get_supabase()
    
    # ========== LOG ALL RECEIVED DATA ==========
    print("\n" + "=" * 70)
    print("🏥 FULL HEALTH CONNECT DATA RECEIVED FROM MOBILE")
    print("=" * 70)
    print(f"User ID: {user_id}")
    print(f"Fetched At: {request.get('fetchedAt', 'N/A')}")
    print(f"Time Range: {request.get('timeRange', {})}")
    print("-" * 70)
    
    # Activity Data
    print("\n📊 ACTIVITY DATA:")
    print(f"  Steps: {request.get('steps', 0)}")
    print(f"  Steps Records: {len(request.get('stepsRecords', []))}")
    for i, r in enumerate(request.get('stepsRecords', [])[:5]):  # Show first 5
        print(f"    Record {i+1}: {r}")
    
    print(f"  Active Calories: {request.get('activeCaloriesBurned', 0)}")
    print(f"  Active Calories Records: {len(request.get('activeCaloriesRecords', []))}")
    for i, r in enumerate(request.get('activeCaloriesRecords', [])[:5]):
        print(f"    Record {i+1}: {r}")
    
    print(f"  Total Calories (with BMR): {request.get('totalCaloriesBurned', 0)}")
    print(f"  Total Calories Records: {len(request.get('totalCaloriesRecords', []))}")
    for i, r in enumerate(request.get('totalCaloriesRecords', [])[:5]):
        print(f"    Record {i+1}: {r}")
    
    print(f"  Distance (km): {request.get('distance', 0)}")
    print(f"  Distance Records: {len(request.get('distanceRecords', []))}")
    for i, r in enumerate(request.get('distanceRecords', [])[:5]):
        print(f"    Record {i+1}: {r}")
    
    print(f"  Floors Climbed: {request.get('floorsClimbed', 0)}")
    
    # Heart Data
    print("\n❤️ HEART DATA:")
    print(f"  Heart Rate (avg bpm): {request.get('heartRate', 0)}")
    print(f"  Heart Rate Records: {len(request.get('heartRateRecords', []))}")
    for i, r in enumerate(request.get('heartRateRecords', [])[:5]):
        print(f"    Record {i+1}: {r}")
    
    # Body Data
    print("\n⚖️ BODY DATA:")
    print(f"  Weight (kg): {request.get('weight', 0)}")
    print(f"  Weight Records: {len(request.get('weightRecords', []))}")
    print(f"  Height (m): {request.get('height', 0)}")
    print(f"  Height Records: {len(request.get('heightRecords', []))}")
    
    # Exercise
    print("\n🏃 EXERCISE:")
    print(f"  Exercise Sessions: {len(request.get('exerciseSessions', []))}")
    for i, r in enumerate(request.get('exerciseSessions', [])[:5]):
        print(f"    Session {i+1}: {r}")
    
    # Sleep
    print("\n😴 SLEEP:")
    print(f"  Sleep Sessions: {len(request.get('sleepSessions', []))}")
    for i, r in enumerate(request.get('sleepSessions', [])[:5]):
        print(f"    Session {i+1}: {r}")
    
    # Nutrition
    print("\n🍎 NUTRITION:")
    print(f"  Nutrition Records: {len(request.get('nutritionRecords', []))}")
    for i, r in enumerate(request.get('nutritionRecords', [])[:5]):
        print(f"    Record {i+1}: {r}")
    print(f"  Hydration (liters): {request.get('hydration', 0)}")
    print(f"  Hydration Records: {len(request.get('hydrationRecords', []))}")
    
    print("\n" + "=" * 70)
    print("📦 FULL RAW REQUEST:")
    print("-" * 70)
    import json
    # Don't print raw records to avoid too much output
    summary = {k: v for k, v in request.items() if not k.endswith('Records')}
    print(json.dumps(summary, indent=2, default=str))
    print("=" * 70 + "\n")
    
    # ========== STORE WHAT WE NEED ==========
    # Using ACTIVE calories (exercise only), not total (which includes BMR)
    new_entry = {
        "steps": request.get('steps', 0),
        "calories_burned": request.get('totalCaloriesBurned', 0),  # Total (BMR + Exercise)
        "active_calories": request.get('activeCaloriesBurned', 0),  # Exercise only
        "total_calories_with_bmr": request.get('totalCaloriesBurned', 0),  # For breakdown
        "active_minutes": int(request.get('steps', 0) / 100),  # Estimate
        "distance_km": request.get('distance', 0),
        "heart_rate": request.get('heartRate', 0),
        "weight": request.get('weight', 0),
        "floors_climbed": request.get('floorsClimbed', 0),
        "hydration": request.get('hydration', 0),
        "synced_at": datetime.utcnow().isoformat(),
        "full_data_summary": {
            "total_calories_with_bmr": request.get('totalCaloriesBurned', 0),
            "active_calories_only": request.get('activeCaloriesBurned', 0),
            "exercise_sessions": len(request.get('exerciseSessions', [])),
            "sleep_sessions": len(request.get('sleepSessions', [])),
            "nutrition_records": len(request.get('nutritionRecords', [])),
        }
    }
    
    print("💾 STORING ENTRY:")
    print(json.dumps(new_entry, indent=2, default=str))
    
    try:
        # Get existing record
        existing = supabase.table("google_fit_sync")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            current_data = existing.data[0].get("sync_data", []) or []
            current_data.append(new_entry)
            
            if len(current_data) > 3:
                current_data = current_data[-3:]
            
            supabase.table("google_fit_sync")\
                .update({
                    "sync_data": current_data,
                    "last_sync_time": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
        else:
            supabase.table("google_fit_sync")\
                .insert({
                    "user_id": user_id,
                    "sync_enabled": True,
                    "sync_data": [new_entry],
                    "last_sync_time": datetime.utcnow().isoformat()
                })\
                .execute()
        
        # Update today's daily_log
        from datetime import date
        today = date.today().isoformat()
        
        daily_result = supabase.table("daily_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("date", today)\
            .execute()
        
        if daily_result.data and len(daily_result.data) > 0:
            supabase.table("daily_logs")\
                .update({
                    "steps": request.get('steps', 0),
                    "active_minutes": int(request.get('steps', 0) / 100),
                    "calories_out": request.get('totalCaloriesBurned', 0),  # Total burn (BMR + Exercise)
                    "google_fit_data": new_entry
                })\
                .eq("id", daily_result.data[0]["id"])\
                .execute()
        
        print("✅ Data stored successfully!")
        
        return {
            "success": True,
            "message": "Full health data received and stored",
            "stored_entry": new_entry
        }
        
    except Exception as e:
        print(f"❌ Error storing data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
