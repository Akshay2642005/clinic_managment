import json
from pydantic import BaseModel
from orchestrator.session import SessionStore
from shared.models import ChatRequest, ChatResponse
from orchestrator.llm import chat_completion

class AdvisoryResponse(BaseModel):
    protocols: list[str]

async def handle_advisory(request: ChatRequest, store: SessionStore) -> ChatResponse:
    system_prompt = """
    You are a medical advisory AI for a clinic. Provide a simple, clear pre-visit preparation checklist based entirely on the user's message.
    Example:
    User: I am booking my appointment to check my blood pressure and blood sugar tested
    Response:
    1) Bring a list of any medications you are currently taking, including blood pressure or diabetes medications.
    2) Carry previous blood pressure or blood sugar test reports, if available.
    3) If a fasting blood sugar test has been requested, avoid eating or drinking anything except water for 8–12 hours before the appointment.
    4) Avoid excessive caffeine, smoking, alcohol, and strenuous exercise for a few hours before the blood pressure test, as these can affect the readings.
    5) Stay hydrated and get adequate rest the night before.
    6) Arrive a few minutes early and sit quietly for 5–10 minutes before your blood pressure measurement.
    Return a JSON object with the following schema:
    {
      "protocols": ["instruction 1", "instruction 2", ...]
    }

    Example 2:
    User: I am booking an appointment because I have been experiencing frequent headaches and dizziness.
    Response:
    1) Keep a record of when the headaches and dizziness occur and how long they last.
    2) Note any triggers such as stress, lack of sleep, dehydration, or specific foods.
    3) Bring a list of current medications and supplements.
    4) Carry previous medical records or imaging reports if available.
    5) Stay hydrated and avoid skipping meals before your appointment.
    Return a JSON object with the following schema:
    {
      "protocols": ["instruction 1", "instruction 2", ...]
    }
    """
    
    llm_response = await chat_completion(
        system_prompt=system_prompt,
        user_message=request.message,
        response_format={"type": "json_object"}
    )
    
    try:
        data = json.loads(llm_response)
        advisory_model = AdvisoryResponse(**data)
        
        # Format the response
        formatted_response = "Pre-Visit Preparation\n"
        for protocol in advisory_model.protocols:
            formatted_response += f"{protocol}\n"
        
        return ChatResponse(
            response=formatted_response,
            data={"advisory": advisory_model.model_dump()}
        )
    except Exception as e:
        return ChatResponse(
            response="I'm sorry, I wasn't able to generate a structured preparation checklist right now."
        )
