from orchestrator.llm import chat_completion

INTENT_PROMPT = """Classify the user's message into exactly one of:
- booking_symptom: patient describes symptoms, pain, medical issue ("my chest hurts", "I have a fever")
- booking_name: patient wants to book with a specific doctor ("book with Dr. Smith")
- cancel: user wants to cancel, delete, or remove an existing appointment ("cancel my appointment", "I want to cancel with Dr. Lee")
- reschedule: user wants to reschedule, change, move, or modify the time/date of an existing appointment ("reschedule my appointment", "move my booking to Friday", "change my appointment with Dr. Smith")
- search: user wants to find, look up, or view appointments, patients, or schedules
- advisory: user asks about preparation, precautions, fasting, what to bring before an appointment
- general: greeting, help, thanks, or unclear

Current user role: {role}
Message: {message}

Respond with JSON only: {{"intent": "str", "confidence": "high|medium|low"}}
"""


async def classify_intent(message: str, role: str) -> dict:
    prompt = INTENT_PROMPT.format(role=role, message=message)
    result = await chat_completion(
        system_prompt="You are an intent classifier. Respond with JSON only.",
        user_message=prompt,
    )
    import json
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"intent": "general", "confidence": "low"}
