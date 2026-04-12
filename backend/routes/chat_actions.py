"""
Chat action routes for handling user confirmations from interactive UI cards.

These endpoints are called when the user taps buttons on cards rendered in the chat:
- Confirm & Log meal
- Apply calorie goal change
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from services.auth import get_user_id
from services.supabase_client import get_supabase
from datetime import date
import uuid

router = APIRouter()


class ConfirmMealRequest(BaseModel):
    food_name: str
    calories: int
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    plate_grade: str = "B"
    reasoning: str = ""
    source: str = "chat"


class ConfirmGoalRequest(BaseModel):
    new_target: int


@router.post("/confirm-meal")
async def confirm_meal_from_chat(
    request: ConfirmMealRequest,
    user_id: str = Depends(get_user_id)
):
    """Save a meal that was previewed via AI chat card."""
    try:
        supabase = get_supabase()
        target_date = date.today().isoformat()

        # Save meal to history
        meal_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "food_name": request.food_name,
            "image_description": "Logged via AI chat",
            "ingredients": "",
            "calories": request.calories,
            "macros": {"p": request.protein, "c": request.carbs, "f": request.fat},
            "plate_grade": request.plate_grade,
            "reasoning": request.reasoning,
            "source": request.source
        }

        supabase.table("meal_history").insert(meal_record).execute()

        # Update daily calorie count
        try:
            daily_result = supabase.table("daily_logs") \
                .select("*").eq("user_id", user_id).eq("date", target_date).single().execute()

            if daily_result.data:
                new_calories = daily_result.data["calories_in"] + request.calories
                supabase.table("daily_logs") \
                    .update({"calories_in": new_calories}).eq("id", daily_result.data["id"]).execute()
            else:
                supabase.table("daily_logs").insert({
                    "user_id": user_id,
                    "date": target_date,
                    "calories_in": request.calories,
                    "calories_out": 0,
                    "water_ml": 0,
                    "steps": 0,
                    "active_minutes": 0
                }).execute()
        except:
            # Create new daily log
            supabase.table("daily_logs").insert({
                "user_id": user_id,
                "date": target_date,
                "calories_in": request.calories,
                "calories_out": 0,
                "water_ml": 0,
                "steps": 0,
                "active_minutes": 0
            }).execute()

        return {
            "message": "Meal logged successfully",
            "meal_id": meal_record["id"],
            "calories": request.calories
        }

    except Exception as e:
        print(f"[ERROR] Confirm meal failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confirm-goal")
async def confirm_goal_update(
    request: ConfirmGoalRequest,
    user_id: str = Depends(get_user_id)
):
    """Update calorie goal from AI chat card confirmation."""
    try:
        supabase = get_supabase()

        supabase.table("profiles") \
            .update({"daily_calorie_target": request.new_target}).eq("id", user_id).execute()

        return {
            "message": "Calorie goal updated successfully",
            "new_target": request.new_target
        }

    except Exception as e:
        print(f"[ERROR] Confirm goal failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
