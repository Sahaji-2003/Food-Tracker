📜 Project Specification: FitFlow AI
1. Project Vision
FitFlow AI is a mobile-first Progressive Web App (PWA) that acts as a proactive health partner. Unlike passive trackers, FitFlow uses Gemini 1.5 Pro/Flash to analyze photos, predict health risks, and assign real-time "Burn Tasks" based on caloric intake vs. activity data from Google Fit.

2. Tech Stack & Infrastructure
Frontend: Vite + React (TypeScript), Tailwind CSS.

UI Components: Shadcn UI, Lucide Icons.

Animations: Framer Motion (for high-end micro-interactions).

PWA Logic: vite-plugin-pwa for service workers, offline manifests, and push notifications.

Local Storage: IndexedDB (via idb or Dexie.js) for offline image and log queuing.

Backend: Python FastAPI.

AI Orchestration: LangChain (connecting Gemini with the database).

Database & Auth: Supabase (PostgreSQL + Vector Store for chat memory).

External API: Google Fit (Rest API for step and calorie sync).

3. Database Architecture (Supabase)
Table: profiles
Stores the core user identity and health constraints.

id: UUID (Primary Key)

age, gender, weight, height: Numeric

medical_conditions, allergies, preferences: Text[] (e.g., ['Diabetes', 'Peanuts', 'Vegan'])

target_goal: Enum (Weight Loss, Muscle Gain, Maintenance)

Table: daily_logs
Stores daily totals for the dashboard.

date: Date (Primary Key)

calories_in, calories_out: Integer

water_ml: Integer

steps: Integer (Synced from Google Fit)

Table: meal_history
Detailed logs of every AI interaction.

id: UUID

image_url: Text (Supabase Storage)

food_name, ingredients: Text

calories, macros: JSONB ({p: 20, c: 50, f: 10})

plate_grade: Text (A+ to F)

assigned_task: Text (e.g., "15 min Jumping Jacks")

4. Core AI Features & Logic
A. Add Meal (Vision-to-Action)
Trigger: User uploads a photo or types text.

Gemini Logic: 1. Identify food and estimate weight/volume. 2. Calculate Calories/Macros. 3. The Burn Task: Compare daily intake vs. goal. If surplus, generate a task.

Output Example:

JSON

{
  "food": "Pepperoni Pizza",
  "calories": 600,
  "plate_grade": "D+",
  "reasoning": "High in saturated fats, low in fiber.",
  "burn_task": "Walk 12,000 steps today to offset this surplus.",
  "task": {
    "name": "walk",
    "time": 60,
    "calories": 600,
    "distance": 6,
    "steps": 12000
  }
}
B. Suggest From Menu
Trigger: User uploads a photo of a restaurant menu.

Gemini Logic: OCR the menu, cross-reference with user allergies and medical_conditions.

Output: Highlight top 3 dishes that won't ruin the user's daily progress.

C. Help in Cooking & Smart Grocery List
Trigger: Photo of fridge/pantry.

Gemini Logic: Suggest 3 healthy recipes.

Smart Feature: Identify what is missing for a complete meal and add it to a Smart Grocery List in the app.

D. Fit Buddy (RAG Chatbot)
A chat interface using LangChain to query the user's historical data in Supabase.

Personalization: "You've eaten 400 calories more than last Tuesday, let's keep dinner light."

5. Advanced PWA & UX Features
📶 Offline Logging (IndexedDB)
If the user is offline, photos and text logs are saved to IndexedDB.

A background sync process uploads them to Supabase once the connection is restored.

🔔 Push Notifications (Web Push API)
Burn Task Reminders: "Hey! You still have 4,000 steps to go to burn off that lunch."

At-Risk Alerts: "I noticed you usually snack on sweets at 9 PM. Drink a glass of water now to stay full!"

🎙️ Voice-to-Log
Integrated Web Speech API. The user taps a mic icon and says: "I just ate a Greek yogurt with honey." Gemini parses the natural language into structured data.

✨ Micro-Interactions (Framer Motion)
Smooth page transitions.

A "filling water" animation for the hydration tracker.

The Dashboard rings should animate from 0 to current value on load.

6. Detailed Example Flow
Morning: User syncs Google Fit; Dashboard shows 500 steps.

Lunch: User takes a photo of a Burger.

AI Response: "650 Calories. Plate Grade: C. Task: 45 min brisk walk."

Afternoon: App sends Push Notification: "It's sunny! Perfect time for that 45 min walk task."

Evening: User asks Fit Buddy: "What can I eat for dinner?"

Buddy: "You have 400 calories left. Based on your fridge photo from earlier, I suggest the Zucchini Salad recipe."


Instruction for Code Builder: * Prioritize the Dashboard and Gemini Vision Integration first.

Ensure all AI responses are formatted as structured JSON for the UI to render.

Use Zustand for global state management (User profile, daily totals).