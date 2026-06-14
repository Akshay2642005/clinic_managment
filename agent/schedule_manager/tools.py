"""
schedule_manager/tools.py
--------------------------
Backend HTTP client helpers + LLM-based detail extractor for the
AI Schedule Manager agent.

All functions call the backend API via httpx — they do NOT touch the DB directly.
"""

import json
from typing import Optional

from orchestrator.llm import chat_completion
from shared.backend_client import get_client


# ---------------------------------------------------------------------------
# Backend API helpers
# ---------------------------------------------------------------------------

async def fetch_appointments(
    patient_id: Optional[int] = None,
    doctor_name: Optional[str] = None,
    patient_name: Optional[str] = None,
    date: Optional[str] = None,
) -> list[dict]:
    """Return appointments from the backend, filtered by the supplied parameters."""
    client = get_client()
    params: dict = {}
    if patient_id is not None:
        params["patient_id"] = patient_id
    if doctor_name:
        params["doctor_name"] = doctor_name
    if patient_name:
        params["patient_name"] = patient_name
    if date:
        params["date"] = date

    resp = await client.get("/appointments/", params=params)
    resp.raise_for_status()
    return resp.json()


async def cancel_appointment(appointment_id: int) -> dict:
    """Cancel an appointment by ID. Returns the updated appointment object."""
    client = get_client()
    resp = await client.put(f"/appointments/cancel/{appointment_id}")
    resp.raise_for_status()
    return resp.json()


async def get_available_slots(doctor_id: int, date: str) -> list[dict]:
    """Return available slots for a given doctor on a given date (YYYY-MM-DD)."""
    client = get_client()
    resp = await client.get(
        "/appointments/slots/available",
        params={"doctor_id": doctor_id, "date": date},
    )
    resp.raise_for_status()
    return resp.json()


async def reschedule_appointment(appointment_id: int, new_slot_id: int) -> dict:
    """Reschedule an appointment to a new slot. Returns the updated appointment object."""
    client = get_client()
    resp = await client.put(
        f"/appointments/reschedule/{appointment_id}",
        json={"new_slot_id": new_slot_id},
    )
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# LLM-based intent detail extractor
# ---------------------------------------------------------------------------

_EXTRACT_PROMPT = """\
You are a scheduling assistant for a medical clinic. Extract appointment management details from the user's message.

The user may want to cancel or reschedule an appointment.

Extract the following fields when present:
- action: "cancel" | "reschedule" | "unknown"
- appointment_id: integer if the user mentions a specific appointment ID, else null
- doctor_name: string if they mention a doctor's name, else null
- patient_name: string if they mention a patient's name (staff use-case), else null
- target_date: natural language date string for the appointment they're referring to (e.g. "tomorrow", "June 18"), else null
- new_date: natural language date string for the new appointment (reschedule only), else null

User message: "{message}"

Respond with JSON only:
{{
  "action": "cancel" | "reschedule" | "unknown",
  "appointment_id": integer | null,
  "doctor_name": string | null,
  "patient_name": string | null,
  "target_date": string | null,
  "new_date": string | null
}}
"""


async def extract_schedule_details(message: str) -> dict:
    """Use the LLM to extract structured scheduling intent from a free-text message."""
    prompt = _EXTRACT_PROMPT.format(message=message)
    result = await chat_completion(
        system_prompt="You extract structured scheduling details from messages. Respond with JSON only.",
        user_message=prompt,
    )
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {
            "action": "unknown",
            "appointment_id": None,
            "doctor_name": None,
            "patient_name": None,
            "target_date": None,
            "new_date": None,
        }
