"""
LangChain tool definitions for the Fit Buddy AI agent.

Each tool returns a JSON string containing:
- card_type: The type of UI card to render on the mobile app
- data: The card-specific payload
- actions: Available buttons/actions for the card

Tools that modify data (log_water) execute immediately.
Tools that create meals (log_meal) return a preview for user confirmation.
"""

import json
from datetime import date
from typing import Optional
from langchain_core.tools import tool
from pydantic import BaseModel, Field


# --- Tool Input Schemas ---

class LogMealInput(BaseModel):
    food_description: str = Field(description="What the user ate, e.g. '2 chapatis'")
    calories: int = Field(default=0, description="Estimated calories for the meal")
    protein: int = Field(default=0, description="Estimated protein in grams")
    carbs: int = Field(default=0, description="Estimated carbs in grams")
    fat: int = Field(default=0, description="Estimated fat in grams")
    plate_grade: str = Field(default="B", description="Grade from A to F evaluating meal healthiness")
    reasoning: str = Field(default="", description="Short 1 sentence explanation of why this grade was given")

class LogWaterInput(BaseModel):
    amount_ml: int = Field(description="Amount of water in milliliters. 1 glass = 250ml, 1 bottle = 500ml, 1 litre = 1000ml")
class GetDailySummaryInput(BaseModel):
    pass  # No input needed

class GenerateRecipeInput(BaseModel):
    recipe_name: str = Field(description="Name of the recipe generated")
    ingredients_list: str = Field(description="A comma-separated list of required ingredients")
    instructions: str = Field(description="Step-by-step markdown formatted instructions on how to cook it")
    cook_time: int = Field(default=0, description="Estimated total cook time in minutes")
    calories: int = Field(default=0, description="Estimated total calories")
    cuisine_preference: str = Field(default="", description="Preferred cuisine type")

class SetCalorieGoalInput(BaseModel):
    new_target: int = Field(description="The new daily calorie target in kcal")
    reason: str = Field(default="", description="Reason for the change (empty string if none)")

class GetMealSuggestionsInput(BaseModel):
    meal_type: str = Field(default="Any", description="Type of meal: breakfast, lunch, dinner, snack")
    max_calories: int = Field(default=0, description="Maximum calories for the suggestion")
    suggestions_json: str = Field(description="A JSON string containing a list of 3 generated meal suggestions. Format: [{'name':'Apple', 'calories':95, 'reason':'High fiber'}]")


class GenerateCustomUIInput(BaseModel):
    title: str = Field(description="A short, catchy title for the card (e.g. 'Your Custom Workout', 'Comparison')")
    layout_json: str = Field(description="A JSON string representing the custom UI layout. Allowed types: Heading, Text, Row, Badge, Divider, ValueProp. Example: {'layout': [{'type':'Heading', 'text':'Workout'}]}")

def create_tools(user_id: str, supabase, gemini_analyze_fn=None):
    """
    Factory function that creates tools bound to a specific user context.
    This ensures each request gets tools with the correct user_id and DB access.
    """

    @tool(args_schema=LogMealInput)
    def log_meal(food_description: str, calories: int = 0, protein: int = 0, carbs: int = 0, fat: int = 0, plate_grade: str = "B", reasoning: str = "") -> str:
        """Analyze a meal from text description and return calorie/macro breakdown.
        Use this when the user tells you what they ate or are eating.
        Provide your best estimation for the nutritional values.
        This returns a preview card — the meal is NOT saved until the user confirms."""
        try:
            # Let the LLM estimation be cleanly bundled in the data 
            result = {
                "card_type": "meal_log_card",
                "data": {
                    "food_description": food_description,
                    "food_name": food_description,
                    "calories": calories,
                    "protein": protein,
                    "carbs": carbs,
                    "fat": fat,
                    "plate_grade": plate_grade,
                    "reasoning": reasoning,
                    "needs_estimation": False
                },
                "actions": [
                    {"label": "✔️ Confirm & Log", "action": "confirm_meal"},
                    {"label": "✏️ Edit", "action": "edit_meal"}
                ]
            }
            return json.dumps(result)

        except Exception as e:
            return json.dumps({
                "card_type": "meal_log_card",
                "data": {"food_description": food_description, "error": str(e), "needs_estimation": True},
                "actions": [{"label": "✔️ Confirm & Log", "action": "confirm_meal"}]
            })

    @tool(args_schema=LogWaterInput)
    def log_water(amount_ml: int) -> str:
        """Add water intake to the user's daily log. This executes immediately.
        Use this when the user says they drank water, had a glass of water, etc.
        Common conversions: 1 glass = 250ml, 1 bottle = 500ml, 1 litre = 1000ml."""
        try:
            target_date = date.today().isoformat()

            # Get current daily log
            try:
                result = supabase.table("daily_logs") \
                    .select("*").eq("user_id", user_id).eq("date", target_date).single().execute()
                daily_log = result.data
            except:
                daily_log = None

            if daily_log:
                new_water = daily_log["water_ml"] + amount_ml
                supabase.table("daily_logs") \
                    .update({"water_ml": new_water}).eq("id", daily_log["id"]).execute()
            else:
                new_water = amount_ml
                supabase.table("daily_logs").insert({
                    "user_id": user_id,
                    "date": target_date,
                    "calories_in": 0,
                    "calories_out": 0,
                    "water_ml": amount_ml,
                    "steps": 0,
                    "active_minutes": 0
                }).execute()

            # Get water target from profile
            try:
                profile = supabase.table("profiles").select("daily_water_target").eq("id", user_id).single().execute()
                water_target = profile.data.get("daily_water_target", 2500) if profile.data else 2500
            except:
                water_target = 2500

            result = {
                "card_type": "water_card",
                "data": {
                    "amount_added_ml": amount_ml,
                    "total_water_ml": new_water,
                    "water_target_ml": water_target,
                    "percentage": round((new_water / water_target) * 100, 1)
                },
                "actions": []
            }
            return json.dumps(result)

        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Failed to log water: {str(e)}"}})

    @tool(args_schema=GetDailySummaryInput)
    def get_daily_summary() -> str:
        """Get the user's daily progress summary including calories, water, steps, macro breakdown, and weekly trends.
        Use this when user asks 'how am I doing?', 'what's my progress?', 'show my stats', 'show analytics', etc."""
        try:
            target_date = date.today().isoformat()

            # Get daily log
            try:
                daily_result = supabase.table("daily_logs") \
                    .select("*").eq("user_id", user_id).eq("date", target_date).single().execute()
                daily_log = daily_result.data or {}
            except:
                daily_log = {"calories_in": 0, "calories_out": 0, "water_ml": 0, "steps": 0, "active_minutes": 0}

            # Get profile for targets
            try:
                profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
                profile = profile_result.data or {}
            except:
                profile = {}

            calorie_target = profile.get("daily_calorie_target", 2000)
            water_target = profile.get("daily_water_target", 2500)
            calories_in = daily_log.get("calories_in", 0)
            calories_out = daily_log.get("calories_out", 0)
            water_ml = daily_log.get("water_ml", 0)
            steps = daily_log.get("steps", 0)
            active_minutes = daily_log.get("active_minutes", 0)
            net_calories = calories_in - calories_out
            remaining = max(calorie_target - net_calories, 0)

            # Get today's meals for macro breakdown
            total_protein = 0
            total_carbs = 0
            total_fat = 0
            meals_today = []
            try:
                meals_result = supabase.table("meal_history") \
                    .select("*").eq("user_id", user_id) \
                    .gte("created_at", target_date) \
                    .order("created_at", desc=True).execute()
                for meal in (meals_result.data or []):
                    macros = meal.get("macros", {})
                    if isinstance(macros, dict):
                        total_protein += macros.get("p", 0) or 0
                        total_carbs += macros.get("c", 0) or 0
                        total_fat += macros.get("f", 0) or 0
                    meals_today.append({
                        "name": meal.get("food_name", "Meal"),
                        "calories": meal.get("calories", 0),
                        "grade": meal.get("plate_grade", "N/A"),
                    })
            except:
                pass

            # Get last 7 days for weekly trend
            from datetime import timedelta
            weekly_data = []
            try:
                week_ago = (date.today() - timedelta(days=6)).isoformat()
                weekly_result = supabase.table("daily_logs") \
                    .select("date,calories_in,calories_out,water_ml,steps") \
                    .eq("user_id", user_id) \
                    .gte("date", week_ago) \
                    .order("date", desc=False).execute()
                for day in (weekly_result.data or []):
                    day_name = date.fromisoformat(day["date"]).strftime("%a")
                    weekly_data.append({
                        "day": day_name,
                        "date": day["date"],
                        "calories_in": day.get("calories_in", 0),
                        "calories_out": day.get("calories_out", 0),
                        "water_ml": day.get("water_ml", 0),
                        "steps": day.get("steps", 0),
                    })
            except:
                pass

            result = {
                "card_type": "daily_summary_card",
                "data": {
                    "calories_in": calories_in,
                    "calories_out": calories_out,
                    "net_calories": net_calories,
                    "calorie_target": calorie_target,
                    "calories_remaining": remaining,
                    "calorie_percentage": round((net_calories / calorie_target) * 100, 1) if calorie_target > 0 else 0,
                    "water_ml": water_ml,
                    "water_target_ml": water_target,
                    "water_percentage": round((water_ml / water_target) * 100, 1) if water_target > 0 else 0,
                    "steps": steps,
                    "active_minutes": active_minutes,
                    "is_over_budget": net_calories > calorie_target,
                    # NEW: macro breakdown
                    "macros": {
                        "protein": round(total_protein, 1),
                        "carbs": round(total_carbs, 1),
                        "fat": round(total_fat, 1),
                    },
                    # NEW: today's meal list
                    "meals_today": meals_today,
                    # NEW: weekly trend (last 7 days)
                    "weekly_trend": weekly_data,
                },
                "actions": []
            }
            return json.dumps(result)

        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Failed to get summary: {str(e)}"}})

    @tool(args_schema=GenerateRecipeInput)
    def generate_recipe(recipe_name: str, ingredients_list: str, instructions: str, cook_time: int = 0, calories: int = 0, cuisine_preference: str = "") -> str:
        """Generate a healthy recipe based on user request.
        Use this when user asks for recipe ideas, 'what can I cook?', 'suggest a meal with X', etc.
        Output Step by Step instructions."""
        try:
            result = {
                "card_type": "recipe_card",
                "data": {
                    "name": recipe_name,
                    "ingredients": [i.strip() for i in ingredients_list.split(',')],
                    "instructions": instructions,
                    "cook_time": cook_time,
                    "calories": calories,
                    "cuisine_preference": cuisine_preference,
                    "needs_generation": False
                },
                "actions": []
            }
            return json.dumps(result)

        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Failed to generate recipe: {str(e)}"}})

    @tool(args_schema=SetCalorieGoalInput)
    def set_calorie_goal(new_target: int, reason: Optional[str] = None) -> str:
        """Preview changing the user's daily calorie target. Returns a confirmation card.
        Use this when user says 'change my goal to X', 'I want to eat X calories', etc.
        The change is NOT applied until user confirms."""
        try:
            # Get current goal
            try:
                profile_result = supabase.table("profiles").select("daily_calorie_target").eq("id", user_id).single().execute()
                current_target = profile_result.data.get("daily_calorie_target", 2000) if profile_result.data else 2000
            except:
                current_target = 2000

            result = {
                "card_type": "goal_update_card",
                "data": {
                    "current_target": current_target,
                    "new_target": new_target,
                    "difference": new_target - current_target,
                    "reason": reason,
                },
                "actions": [
                    {"label": "✔️ Apply", "action": "confirm_goal", "payload": {"new_target": new_target}},
                    {"label": "✖️ Cancel", "action": "cancel"}
                ]
            }
            return json.dumps(result)

        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Failed to preview goal: {str(e)}"}})

    @tool(args_schema=GetMealSuggestionsInput)
    def get_meal_suggestions(suggestions_json: str, meal_type: str = "Any", max_calories: int = 0) -> str:
        """Suggest healthy meals based on the user's request.
        Use this when user asks 'what should I eat?', 'suggest a meal', 'I'm hungry', etc.
        Return 3 generated suggestions natively parsed from the suggestions_json."""
        try:
            from datetime import date
            if max_calories <= 0:
                try:
                    profile_result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
                    profile = profile_result.data or {}
                    target_date = date.today().isoformat()
                    daily_result = supabase.table("daily_logs").select("*").eq("user_id", user_id).eq("date", target_date).single().execute()
                    daily_log = daily_result.data or {}
                    calorie_target = profile.get("daily_calorie_target", 2000)
                    calories_in = daily_log.get("calories_in", 0)
                    calories_out = daily_log.get("calories_out", 0)
                    max_calories = max(calorie_target - (calories_in - calories_out), 200)
                except:
                    max_calories = 500
            try:
                suggestions = json.loads(suggestions_json)
            except:
                suggestions = []
                
            result = {
                "card_type": "meal_suggestions_card",
                "data": {
                    "needs_generation": False,
                    "meal_type": meal_type,
                    "max_calories": max_calories,
                    "suggestions": suggestions,
                },
                "actions": []
            }
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Failed to get suggestions: {str(e)}"}})

    @tool(args_schema=GenerateCustomUIInput)
    def generate_custom_ui(title: str, layout_json: str) -> str:
        """Create a completely custom dynamic UI layout when you want to show structured information that doesn't fit standard tools (e.g. workout plans, comparison tables).
        Pass a dictionary with a 'layout' list encoded as a JSON string.
        Available components for the layout: 'Heading', 'Text', 'Row' (contains 'items'), 'Badge' (contains 'text', 'bgColor'), 'Divider', 'ValueProp' (contains 'label', 'value', 'color')."""
        try:
            # Parse the string into dict to ensure it's valid JSON
            layout_data = json.loads(layout_json)
            layout_data["title"] = title
            
            result = {
                "card_type": "dynamic_ui_card",
                "data": layout_data,
                "actions": []
            }
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"card_type": "error", "data": {"message": f"Invalid dynamic UI JSON: {str(e)}"}})

    return [log_meal, log_water, get_daily_summary, generate_recipe, set_calorie_goal, get_meal_suggestions, generate_custom_ui]

