"""
LangChain Agent Service for Fit Buddy AI.

Uses ChatGoogleGenerativeAI with bind_tools for tool calling.
Handles the ReAct loop manually (no langgraph dependency needed).

Flow:
1. Build messages (system + history + user message)
2. Call LLM with bound tools
3. If LLM returns tool_calls → execute tools → feed results back → call LLM again
4. Return final text response + any UI cards from tool results
"""

import json
from typing import List, Optional, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from config import settings
from services.agent_tools import create_tools
from datetime import date, timedelta


def get_agent_llm():
    """Get LangChain ChatGoogleGenerativeAI instance for the agent."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.7,
    )


def build_enhanced_system_prompt(user_profile: dict, meals_history: list, daily_log: dict) -> str:
    """Build an enhanced system prompt with tool awareness and personality."""

    # User profile info
    profile_info = f"""
## User Profile
- Name: {user_profile.get('email', 'User').split('@')[0].title()}
- Age: {user_profile.get('age', 'Unknown')}
- Gender: {user_profile.get('gender', 'Unknown')}
- Weight: {user_profile.get('weight', 'Unknown')} kg
- Height: {user_profile.get('height', 'Unknown')} cm
- Goal: {user_profile.get('target_goal', 'General Health')}
- Daily Calorie Target: {user_profile.get('daily_calorie_target', 2000)} cal
- Daily Water Target: {user_profile.get('daily_water_target', 2500)} ml
- Medical Conditions: {', '.join(user_profile.get('medical_conditions', [])) or 'None'}
- Allergies: {', '.join(user_profile.get('allergies', [])) or 'None'}
- Dietary Preferences: {', '.join(user_profile.get('preferences', [])) or 'None'}
- Preferred Activities: {', '.join(user_profile.get('preferred_tasks', [])) or 'Walking'}
"""

    # Today's progress
    calories_in = daily_log.get('calories_in', 0)
    calories_out = daily_log.get('calories_out', 0)
    today_info = f"""
## Today's Progress (Live Data)
- Calories Consumed: {calories_in} cal
- Calories Burned: {calories_out} cal
- Net Calories: {calories_in - calories_out} cal
- Remaining Budget: {max(user_profile.get('daily_calorie_target', 2000) - (calories_in - calories_out), 0)} cal
- Water Intake: {daily_log.get('water_ml', 0)} ml
- Steps: {daily_log.get('steps', 0)}
- Active Minutes: {daily_log.get('active_minutes', 0)}
"""

    # Recent meals
    meals_info = "\n## Recent Meals (Last 3 Days)\n"
    if meals_history:
        for meal in meals_history[:10]:
            meals_info += f"- {meal.get('food_name', 'Unknown')}: {meal.get('calories', 0)} cal (Grade: {meal.get('plate_grade', 'N/A')})\n"
    else:
        meals_info += "No recent meals logged.\n"

    system_prompt = f"""You are **Fit Buddy**, an expert AI health & nutrition coach inside the FitFlow mobile app.

## Your Personality
- Warm, encouraging, and slightly playful
- Celebrate wins enthusiastically ("🎉 Amazing! You're crushing it today!")
- Empathetic about setbacks ("No worries, one meal doesn't define your journey 💪")
- Proactive — suggest actions, don't just passively answer
- Use emojis naturally but not excessively (1-2 per message)

{profile_info}
{today_info}
{meals_info}

## Your Tools (Superpowers)
You have access to tools that can take real actions. Use them when appropriate:

1. **log_meal** — When user describes food they ate. ALWAYS use this instead of manually estimating calories. Examples: "I ate biryani", "had 2 eggs for breakfast", "just finished a pizza"
2. **log_water** — When user mentions drinking water. Log it immediately. Examples: "drank a glass of water", "had 500ml water", "I'm keeping hydrated"
3. **get_daily_summary** — When user asks about their progress. Examples: "how am I doing?", "show my stats", "what's my progress?"
4. **generate_recipe** — When user wants cooking ideas. Examples: "what can I cook with chicken?", "suggest a recipe", "I have rice and dal"
5. **set_calorie_goal** — When user wants to change their target. Examples: "change my goal to 1800", "I want to eat 2200 calories"
6. **get_meal_suggestions** — When user asks what to eat. Examples: "what should I eat?", "I'm hungry", "suggest dinner"

## Critical Rules
1. **When user describes eating food → ALWAYS call log_meal.** Never manually estimate calories in text.
2. **When user asks about progress → call get_daily_summary.** Don't make up numbers.
3. When a tool returns data, incorporate it naturally into your response.
4. When NO tool is needed (general health questions, motivation, etc.), respond with helpful text using markdown formatting.
5. Keep responses concise — 2-3 sentences when a tool/card is present, 2-4 paragraphs for text-only answers.
6. Never diagnose medical conditions — recommend consulting a doctor.
7. If a meal description is vague (e.g., "I ate food"), ask for specifics before calling log_meal.
8. For the log_meal tool, you MUST fill in the nutritional estimates (calories, protein, carbs, fat, plate_grade) in your response text based on your nutrition knowledge. The tool provides context, but YOU provide the analysis.

## Response Format
- For tool-based responses: Give a short, friendly message that contextualizes the card data
- For text-only responses: Use markdown (bold, lists, headers) for readability
- Always be actionable — end with a suggestion or next step when possible
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


def extract_ui_cards_from_tool_results(tool_results: list) -> list:
    """Parse UI card data from tool execution results."""
    ui_cards = []
    for result in tool_results:
        try:
            data = json.loads(result) if isinstance(result, str) else result
            if isinstance(data, dict) and "card_type" in data:
                ui_cards.append(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return ui_cards


async def chat_with_agent(
    message: str,
    user_id: str,
    user_profile: dict,
    meals_history: list,
    daily_log: dict,
    chat_history: list,
    supabase
) -> Dict[str, Any]:
    """
    Chat with the AI agent. Returns both text response and UI cards.
    
    Falls back gracefully to plain text if tool calling fails.
    
    Returns:
        {
            "response": "text message",
            "ui_cards": [{"card_type": "...", "data": {...}, "actions": [...]}],
            "actions_taken": ["log_water", ...]
        }
    """
    try:
        llm = get_agent_llm()

        # Create tools bound to this user's context
        tools = create_tools(user_id, supabase)

        # Bind tools to the LLM
        llm_with_tools = llm.bind_tools(tools)

        # Build system context
        system_context = build_enhanced_system_prompt(user_profile, meals_history, daily_log)

        # Build message history
        messages = build_message_history(chat_history, system_context)

        # Add current user message
        messages.append(HumanMessage(content=message))

        # === First LLM call (may include tool_calls) ===
        response = await llm_with_tools.ainvoke(messages)

        ui_cards = []
        actions_taken = []

        # === Check if the LLM wants to call tools ===
        if response.tool_calls:
            # Execute each tool call
            tool_map = {t.name: t for t in tools}
            tool_results = []

            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                print(f"[AGENT] Calling tool: {tool_name} with args: {tool_args}")
                actions_taken.append(tool_name)

                if tool_name in tool_map:
                    try:
                        result = tool_map[tool_name].invoke(tool_args)
                        tool_results.append(result)
                        print(f"[AGENT] Tool {tool_name} returned: {str(result)[:200]}")
                    except Exception as e:
                        print(f"[AGENT] Tool {tool_name} failed: {str(e)}")
                        tool_results.append(json.dumps({
                            "card_type": "error",
                            "data": {"message": f"Tool {tool_name} failed: {str(e)}"}
                        }))
                else:
                    print(f"[AGENT] Unknown tool: {tool_name}")
                    tool_results.append(json.dumps({
                        "card_type": "error",
                        "data": {"message": f"Unknown tool: {tool_name}"}
                    }))

            # Extract UI cards from tool results
            ui_cards = extract_ui_cards_from_tool_results(tool_results)

            # === Second LLM call with tool results ===
            # Add the AI's tool-call message and the tool results to the conversation
            messages.append(response)  # AI message with tool_calls

            for i, tool_call in enumerate(response.tool_calls):
                tool_msg = ToolMessage(
                    content=tool_results[i] if i < len(tool_results) else "{}",
                    tool_call_id=tool_call["id"]
                )
                messages.append(tool_msg)

            # Get final response after tools executed
            final_response = await llm_with_tools.ainvoke(messages)
            response_text = final_response.content

        else:
            # No tools called — plain text response
            response_text = response.content

        return {
            "response": response_text,
            "ui_cards": ui_cards,
            "actions_taken": actions_taken
        }

    except Exception as e:
        print(f"[AGENT ERROR] Agent failed, falling back to basic chat: {str(e)}")
        import traceback
        traceback.print_exc()

        # === FALLBACK: Use the old simple chat method ===
        # This ensures plain text chat NEVER breaks even if tool calling fails
        try:
            from services.langchain_chat import chat_with_context_basic
            fallback_response = await chat_with_context_basic(
                message=message,
                user_profile=user_profile,
                meals_history=meals_history,
                daily_log=daily_log,
                chat_history=chat_history
            )
            return {
                "response": fallback_response,
                "ui_cards": [],
                "actions_taken": []
            }
        except Exception as fallback_error:
            print(f"[AGENT ERROR] Fallback also failed: {str(fallback_error)}")
            return {
                "response": "I'm having trouble right now. Please try again in a moment! 🙏",
                "ui_cards": [],
                "actions_taken": []
            }
