from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_user_id
from services.supabase_client import get_supabase
from models import ProfileData

router = APIRouter()


@router.get("")
async def get_profile(user_id: str = Depends(get_user_id)):
    """Get user profile."""
    supabase = get_supabase()
    
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        
        if not result.data:
            # Create default profile if not exists
            default_profile = {
                "id": user_id,
                "daily_calorie_target": 2000,
                "daily_water_target": 2500,
                "medical_conditions": [],
                "allergies": [],
                "preferences": [],
            }
            supabase.table("profiles").insert(default_profile).execute()
            return default_profile
        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("")
async def update_profile(
    profile: ProfileData,
    user_id: str = Depends(get_user_id)
):
    """Update user profile."""
    supabase = get_supabase()
    
    try:
        update_data = profile.model_dump(exclude_unset=True)
        update_data["id"] = user_id
        
        result = supabase.table("profiles").upsert(update_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
