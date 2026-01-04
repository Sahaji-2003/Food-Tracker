from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


# Meal Analysis Models
class MealAnalysisRequest(BaseModel):
    image_url: Optional[str] = None
    text: Optional[str] = None


class BurnTaskData(BaseModel):
    name: str
    time: int  # duration in minutes
    calories: int
    distance: Optional[float] = None  # in km
    steps: Optional[int] = None


class MealAnalysisResponse(BaseModel):
    food: str
    calories: int
    macros: Dict[str, int]  # {p: protein, c: carbs, f: fat}
    plate_grade: str
    reasoning: str
    burn_task: str
    task: BurnTaskData


# Menu Suggestion Models
class MenuSuggestionRequest(BaseModel):
    image_url: str


class MenuSuggestion(BaseModel):
    dish_name: str
    calories: int
    reasoning: str
    recommended: bool


class MenuSuggestionResponse(BaseModel):
    suggestions: List[MenuSuggestion]


# Cooking Helper Models
class CookingHelperRequest(BaseModel):
    image_url: str


class Recipe(BaseModel):
    name: str
    ingredients: List[str]
    instructions: str
    calories: int
    macros: Dict[str, int]


class CookingHelperResponse(BaseModel):
    recipes: List[Recipe]
    missing_ingredients: List[str]


# Chat Models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


# Profile Models
class ProfileData(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    medical_conditions: List[str] = []
    allergies: List[str] = []
    preferences: List[str] = []
    target_goal: Optional[str] = None
    daily_calorie_target: int = 2000
    daily_water_target: int = 2500


# Daily Log Models
class DailyLogResponse(BaseModel):
    date: str
    calories_in: int
    calories_out: int
    water_ml: int
    steps: int
    active_minutes: int
