from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings
from datetime import date, timedelta


def get_chat_llm():
    """Get LangChain ChatGoogleGenerativeAI instance."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.7,
    )


def build_system_context(user_profile: dict, meals_history: list, daily_log: dict) -> str:
    """Build comprehensive context for the chat from user data."""
    
    # User profile info
    profile_info = f"""
## User Profile
- Age: {user_profile.get('age', 'Unknown')}
- Gender: {user_profile.get('gender', 'Unknown')}
- Weight: {user_profile.get('weight', 'Unknown')} kg
- Height: {user_profile.get('height', 'Unknown')} cm
- Goal: {user_profile.get('target_goal', 'General Health')}
- Daily Calorie Target: {user_profile.get('daily_calorie_target', 2000)} cal
- Medical Conditions: {', '.join(user_profile.get('medical_conditions', [])) or 'None'}
- Allergies: {', '.join(user_profile.get('allergies', [])) or 'None'}
- Dietary Preferences: {', '.join(user_profile.get('preferences', [])) or 'None'}
- Preferred Activities: {', '.join(user_profile.get('preferred_tasks', [])) or 'Walking'}
"""

    # Today's progress
    today_info = f"""
## Today's Progress
- Calories Consumed: {daily_log.get('calories_in', 0)} cal
- Calories Burned: {daily_log.get('calories_out', 0)} cal
- Net Calories: {daily_log.get('calories_in', 0) - daily_log.get('calories_out', 0)} cal
- Water Intake: {daily_log.get('water_ml', 0)} ml
- Steps: {daily_log.get('steps', 0)}
- Active Minutes: {daily_log.get('active_minutes', 0)}
"""

    # Recent meals (last 3 days)
    meals_info = "\n## Recent Meals (Last 3 Days)\n"
    if meals_history:
        for meal in meals_history[:15]:  # Limit to 15 most recent
            meals_info += f"- {meal.get('food_name', 'Unknown')}: {meal.get('calories', 0)} cal (Grade: {meal.get('plate_grade', 'N/A')})\n"
    else:
        meals_info += "No recent meals logged.\n"

    system_prompt = f"""You are Fit Buddy, a friendly and knowledgeable AI health and nutrition assistant. 
You help users with their health and fitness goals by providing personalized advice based on their profile and eating habits.

{profile_info}
{today_info}
{meals_info}

## Guidelines
1. Be encouraging, supportive, and positive
2. Give specific, actionable advice based on the user's profile and goals
3. Reference their recent meals when relevant
4. Consider their medical conditions and allergies when suggesting foods
5. Suggest activities from their preferred list: {', '.join(user_profile.get('preferred_tasks', ['Walking']))}
6. Keep responses concise but helpful (2-4 paragraphs max)
7. Use emojis sparingly to keep the conversation friendly
8. If asked about medical issues, remind them to consult a healthcare professional

Remember: You have access to their meal history and daily progress. Use this context to give personalized responses!
"""
    return system_prompt


def build_message_history(chat_history: list, system_context: str) -> list:
    """Convert chat history from DB to LangChain message format."""
    messages = [SystemMessage(content=system_context)]
    
    for msg in chat_history:
        if msg.get('role') == 'user':
            messages.append(HumanMessage(content=msg.get('content', '')))
        elif msg.get('role') == 'assistant':
            messages.append(AIMessage(content=msg.get('content', '')))
    
    return messages


async def chat_with_context(
    message: str,
    user_profile: dict,
    meals_history: list,
    daily_log: dict,
    chat_history: list
) -> str:
    """Chat with AI using full context and conversation history."""
    try:
        llm = get_chat_llm()
        
        # Build system context
        system_context = build_system_context(user_profile, meals_history, daily_log)
        
        # Build message history
        messages = build_message_history(chat_history, system_context)
        
        # Add current user message
        messages.append(HumanMessage(content=message))
        
        # Get AI response
        response = await llm.ainvoke(messages)
        
        return response.content
        
    except Exception as e:
        raise Exception(f"Chat failed: {str(e)}")
