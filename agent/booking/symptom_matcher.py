from orchestrator.llm import chat_completion

MATCH_PROMPT = """You are a medical triage assistant. Given a patient's described symptoms, map them to the most relevant medical specialization.

Available specializations: Cardiology, Dermatology, Orthopedics, General Medicine, Pediatrics, ENT, Ophthalmology, Neurology, Gastroenterology, Pulmonology

Patient symptoms: "{symptoms}"

Respond with JSON:
{{"specialization": "str", "confidence": "high|medium|low", "reason": "str"}}
"""


async def match_symptoms(symptoms: str) -> dict:
    prompt = MATCH_PROMPT.format(symptoms=symptoms)
    result = await chat_completion(
        system_prompt="You map symptoms to medical specializations. Respond with JSON only.",
        user_message=prompt,
    )
    import json
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"specialization": "General Medicine", "confidence": "low", "reason": "Fallback match"}
