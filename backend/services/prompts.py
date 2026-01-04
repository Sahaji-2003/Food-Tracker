# Gemini AI Prompts for FitFlow

MEAL_ANALYSIS_PROMPT_TEMPLATE = """Analyze this food image and provide a detailed, personalized nutritional assessment.

USER PROFILE:
- Gender: {gender}
- Age: {age} years
- Height: {height} cm
- Weight: {weight} kg
- Daily Calorie Target: {calorie_target} kcal
- Calories Already Consumed Today: {calories_consumed} kcal
- Preferred Activities: {preferred_tasks}

CALORIE BURN REFERENCE TABLE (adjust based on user's weight):
| Gender | Weight | Moderate Walk (6,000 steps) | Brisk Walk (7,500 steps) |
|--------|--------|----------------------------|--------------------------|
| Male   | 60 kg  | 230 kcal                   | 328 kcal                |
| Male   | 70 kg  | 244 kcal                   | 349 kcal                |
| Male   | 80 kg  | 259 kcal                   | 370 kcal                |
| Male   | 90 kg  | 273 kcal                   | 390 kcal                |
| Female | 50 kg  | 180 kcal                   | 257 kcal                |
| Female | 60 kg  | 202 kcal                   | 288 kcal                |
| Female | 70 kg  | 224 kcal                   | 319 kcal                |
| Female | 80 kg  | 245 kcal                   | 350 kcal                |

CALORIE GUIDELINES:
- Walking: ~100 kcal per 2000 steps at 4 km/hour
- Running: ~100 kcal per 1000 steps at 8 km/hour
- Swimming: ~400-700 kcal/hour depending on intensity
- Gym Workout: ~300-500 kcal/hour
- Yoga: ~150-300 kcal/hour
- Cycling: ~400-600 kcal/hour
- HIIT: ~500-800 kcal/hour

Return a JSON object with EXACTLY this structure:
{{
    "food": "Name of the overall meal",
    "image_description": "Detailed description of the food (appearance, colors, portion size, plate/container)",
    "items": [
        {{"name": "item 1 name", "calories": 000, "quantity": "portion description"}},
        {{"name": "item 2 name", "calories": 000, "quantity": "portion description"}}
    ],
    "total_calories": 000,
    "macros": {{"p": 00, "c": 00, "f": 00}},
    "plate_grade": "A+ to F",
    "reasoning": "Brief explanation of the grade",
    "ingredients": "comma-separated list of all detected ingredients",
    "excess_calories": 000,
    "tasks": [
        {{
            "type": "activity type (walking/running/swimming/gym/yoga/cycling/hiit)",
            "name": "Human readable task name",
            "duration_minutes": 00,
            "calories_to_burn": 000,
            "distance_km": 0.0,
            "steps": 0000,
            "description": "Markdown formatted detailed instructions for this activity. Include:\n- What exercises/movements to do\n- How many reps/sets or duration for each\n- Any tips for proper form\n- Make it specific to burning the specified calories"
        }}
    ]
}}

IMPORTANT RULES:
1. Break down the meal into individual items with calories for EACH item
2. Be REALISTIC with calorie estimates - don't overestimate carbs or portions
3. Calculate excess_calories = (calories_consumed + total_calories) - calorie_target  (if not given this then predict the expected calories to be consumed according to the given users details.)
   - If excess_calories <= 0, set to 0 (no burn needed, within budget)
   - Only suggest tasks to burn the EXCESS calories, not the entire meal
4. Generate tasks ONLY for the user's preferred activities: {preferred_tasks}
5. Personalize calorie burn estimates based on user's weight and gender
6. If no excess calories, return empty tasks array
7. Plate grade should consider the user's goal (if they're trying to lose weight, grade accordingly)
8. For each task, provide detailed markdown description with specific exercises and instructions

TASK DESCRIPTION EXAMPLES:
- For walking: "## 30-min Walk\\n\\n**Goal:** Burn 150 calories\\n\\n### Route\\n- Walk at 4 km/h pace\\n- Keep arms swinging naturally\\n\\n### Tips\\n- Stay hydrated\\n- Wear comfortable shoes"
- For yoga: "## 20-min Yoga Flow\\n\\n**Goal:** Burn 100 calories\\n\\n### Sequence\\n1. **Sun Salutation A** - 5 rounds\\n2. **Warrior I & II** - Hold 30 sec each side\\n3. **Tree Pose** - 1 min each side\\n\\n### Focus\\n- Deep breathing\\n- Mindful movement"
- For gym: "## Gym Workout\\n\\n**Goal:** Burn 200 calories\\n\\n### Exercises\\n1. **Squats** - 3 sets x 12 reps\\n2. **Lunges** - 3 sets x 10 each leg\\n3. **Push-ups** - 3 sets x 15 reps\\n\\n### Rest\\n- 60 seconds between sets"

Return ONLY valid JSON, no markdown or extra text."""


MEAL_TEXT_PROMPT = """Analyze this meal described as: "{text}"

USER PROFILE:
- Gender: {gender}
- Age: {age} years
- Height: {height} cm
- Weight: {weight} kg
- Daily Calorie Target: {calorie_target} kcal
- Calories Already Consumed Today: {calories_consumed} kcal
- Preferred Activities: {preferred_tasks}

Return a JSON object with EXACTLY this structure:
{{
    "food": "Name of the meal",
    "image_description": "N/A - text description",
    "items": [
        {{"name": "item 1 name", "calories": 000, "quantity": "portion description"}},
        {{"name": "item 2 name", "calories": 000, "quantity": "portion description"}}
    ],
    "total_calories": 000,
    "macros": {{"p": 00, "c": 00, "f": 00}},
    "plate_grade": "A+ to F",
    "reasoning": "Brief explanation of the grade",
    "ingredients": "comma-separated list of detected ingredients",
    "excess_calories": 000,
    "tasks": [
        {{
            "type": "activity type",
            "name": "Human readable task name",
            "duration_minutes": 00,
            "calories_to_burn": 000,
            "distance_km": 0.0,
            "steps": 0000,
            "description": "Markdown formatted detailed instructions"
        }}
    ]
}}

Guidelines:
- Be realistic with calorie estimates
- Calculate excess_calories = (calories_consumed + total_calories) - calorie_target
- Only suggest tasks if there are excess calories
- Generate tasks only for preferred activities: {preferred_tasks}

Return ONLY valid JSON, no markdown or extra text."""


MENU_SUGGESTION_PROMPT = """Analyze this menu image and suggest the healthiest options.

User's dietary restrictions:
- Allergies: {allergies}
- Medical conditions: {conditions}
- Preferences: {preferences}
- Remaining calorie budget: {calories_remaining} kcal

Return a JSON object with recommendations for healthy choices from the menu."""


COOKING_HELPER_PROMPT = """Analyze this image of pantry/fridge contents and suggest healthy recipes.

User's dietary restrictions:
- Allergies: {allergies}
- Medical conditions: {conditions}
- Preferences: {preferences}

Return a JSON object with recipe suggestions using the visible ingredients."""


CHAT_SYSTEM_PROMPT = """You are Fit Buddy, a friendly and knowledgeable AI health assistant for the FitFlow app.

User Profile:
- Goal: {goal}
- Daily Calorie Target: {calorie_target} kcal
- Medical Conditions: {conditions}
- Allergies: {allergies}
- Dietary Preferences: {preferences}

Today's Progress:
- Calories In: {calories_in} kcal
- Calories Burned: {calories_out} kcal
- Water: {water_ml} ml
- Steps: {steps}

Be encouraging, helpful, and provide personalized advice. Keep responses concise and actionable."""
