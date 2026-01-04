import google.generativeai as genai
from config import settings
import json
import base64
from typing import Optional

# Import prompts from prompts.py
from services.prompts import (
    MEAL_ANALYSIS_PROMPT_TEMPLATE,
    MEAL_TEXT_PROMPT,
    MENU_SUGGESTION_PROMPT,
    COOKING_HELPER_PROMPT,
    CHAT_SYSTEM_PROMPT
)

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)

# Models - Using model from environment config
vision_model = genai.GenerativeModel(settings.gemini_model)
text_model = genai.GenerativeModel(settings.gemini_model)


def _parse_json_response(text: str) -> dict:
    """Parse JSON from Gemini response, handling markdown code blocks."""
    # Remove markdown code blocks if present
    text = text.strip()
    if text.startswith('```json'):
        text = text[7:]
    elif text.startswith('```'):
        text = text[3:]
    if text.endswith('```'):
        text = text[:-3]
    
    return json.loads(text.strip())


async def analyze_meal_image(
    image_data: bytes,
    user_profile: dict = None,
    calories_consumed: int = 0
) -> dict:
    """Analyze a meal image using Gemini Vision with personalized context."""
    try:
        print(f"[DEBUG] analyze_meal_image called, image size: {len(image_data)} bytes")
        print(f"[DEBUG] User profile: {user_profile}")
        print(f"[DEBUG] Calories consumed today: {calories_consumed}")
        
        # Default profile values
        profile = user_profile or {}
        gender = profile.get("gender", "unknown")
        age = profile.get("age", 25)
        height = profile.get("height", 170)
        weight = profile.get("weight", 70)
        calorie_target = profile.get("daily_calorie_target", 2000)
        preferred_tasks = profile.get("preferred_tasks", ["walking"])
        
        # Format the personalized prompt
        prompt = MEAL_ANALYSIS_PROMPT_TEMPLATE.format(
            gender=gender,
            age=age,
            height=height,
            weight=weight,
            calorie_target=calorie_target,
            calories_consumed=calories_consumed,
            preferred_tasks=", ".join(preferred_tasks) if preferred_tasks else "walking"
        )
        
        # Create image part for Gemini
        image_parts = [
            {"mime_type": "image/jpeg", "data": base64.b64encode(image_data).decode()}
        ]
        print("[DEBUG] Image encoded to base64")
        
        print("[DEBUG] Sending request to Gemini Vision API...")
        response = await vision_model.generate_content_async([
            prompt,
            {"inline_data": image_parts[0]}
        ])
        print(f"[DEBUG] Gemini response received, raw text: {response.text[:300]}...")
        
        result = _parse_json_response(response.text)
        print(f"[DEBUG] JSON parsed successfully")
        return result
    except Exception as e:
        print(f"[ERROR] analyze_meal_image failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to analyze meal image: {str(e)}")


async def analyze_meal_text(text: str) -> dict:
    """Analyze a meal from text description."""
    try:
        prompt = MEAL_TEXT_PROMPT.format(text=text)
        response = await text_model.generate_content_async(prompt)
        return _parse_json_response(response.text)
    except Exception as e:
        raise Exception(f"Failed to analyze meal text: {str(e)}")


async def analyze_menu(
    image_data: bytes,
    allergies: list = [],
    conditions: list = [],
    preferences: list = [],
    calories_remaining: int = 2000
) -> dict:
    """Analyze a menu image and suggest healthy options."""
    try:
        prompt = MENU_SUGGESTION_PROMPT.format(
            allergies=", ".join(allergies) if allergies else "None",
            conditions=", ".join(conditions) if conditions else "None",
            preferences=", ".join(preferences) if preferences else "None",
            calories_remaining=calories_remaining
        )
        
        image_parts = [
            {"mime_type": "image/jpeg", "data": base64.b64encode(image_data).decode()}
        ]
        
        response = await vision_model.generate_content_async([
            prompt,
            {"inline_data": image_parts[0]}
        ])
        
        return _parse_json_response(response.text)
    except Exception as e:
        raise Exception(f"Failed to analyze menu: {str(e)}")


async def analyze_pantry(
    image_data: bytes,
    allergies: list = [],
    conditions: list = [],
    preferences: list = []
) -> dict:
    """Analyze a pantry/fridge image and suggest recipes."""
    try:
        prompt = COOKING_HELPER_PROMPT.format(
            allergies=", ".join(allergies) if allergies else "None",
            conditions=", ".join(conditions) if conditions else "None",
            preferences=", ".join(preferences) if preferences else "None"
        )
        
        image_parts = [
            {"mime_type": "image/jpeg", "data": base64.b64encode(image_data).decode()}
        ]
        
        response = await vision_model.generate_content_async([
            prompt,
            {"inline_data": image_parts[0]}
        ])
        
        return _parse_json_response(response.text)
    except Exception as e:
        raise Exception(f"Failed to analyze pantry: {str(e)}")


async def chat(
    message: str,
    user_profile: dict,
    daily_log: dict
) -> str:
    """Chat with Fit Buddy AI."""
    try:
        system_prompt = CHAT_SYSTEM_PROMPT.format(
            goal=user_profile.get("target_goal", "General Health"),
            calorie_target=user_profile.get("daily_calorie_target", 2000),
            conditions=", ".join(user_profile.get("medical_conditions", [])) or "None",
            allergies=", ".join(user_profile.get("allergies", [])) or "None",
            preferences=", ".join(user_profile.get("preferences", [])) or "None",
            calories_in=daily_log.get("calories_in", 0),
            calories_out=daily_log.get("calories_out", 0),
            water_ml=daily_log.get("water_ml", 0),
            steps=daily_log.get("steps", 0)
        )
        
        response = await text_model.generate_content_async([
            system_prompt,
            f"User message: {message}"
        ])
        
        return response.text
    except Exception as e:
        raise Exception(f"Chat failed: {str(e)}")
