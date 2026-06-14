"""
schedule_manager/agent.py
--------------------------
Conversational state-machine for Feature 2: AI Schedule Manager.

Handles two intents:
  - cancel   → confirms with the user then cancels the appointment via backend
  - reschedule → picks a new date/slot then reschedules via backend

Role rules (enforced here, not at the transport layer):
  - patient  → may only manage their own appointments (filtered by patient_id)
  - staff    → may manage any patient's appointments (filtered by patient/doctor name)
  - doctor   → treated the same as staff for this feature
"""

from search.date_parser import parse_date
from schedule_manager.state import ScheduleState
from schedule_manager.tools import (
    cancel_appointment,
    extract_schedule_details,
    fetch_appointments,
    get_available_slots,
    reschedule_appointment,
)
from orchestrator.session import SessionStore
from shared.models import ChatRequest, ChatResponse


# ---------------------------------------------------------------------------
# Entry point — called by orchestrator/server.py
# ---------------------------------------------------------------------------

async def handle_schedule_change(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    state = store.get_state(session_id, "schedule_state", ScheduleState.IDLE)

    if state == ScheduleState.IDLE:
        return await _start(request, store)

    elif state == ScheduleState.AWAITING_APPOINTMENT_SELECTION:
        return await _handle_appointment_selection(request, store)

    elif state == ScheduleState.AWAITING_CANCEL_CONFIRMATION:
        return await _handle_cancel_confirmation(request, store)

    elif state == ScheduleState.AWAITING_RESCHEDULE_DATE:
        return await _handle_reschedule_date(request, store)

    elif state == ScheduleState.AWAITING_RESCHEDULE_SLOT:
        return await _handle_reschedule_slot(request, store)

    elif state == ScheduleState.AWAITING_RESCHEDULE_CONFIRMATION:
        return await _handle_reschedule_confirmation(request, store)

    # Fallback — should not normally be reached
    store.clear_state(session_id)
    return ChatResponse(
        response="Something went wrong with the schedule manager session. Let's start over — how can I help you?"
    )


# ---------------------------------------------------------------------------
# State handlers
# ---------------------------------------------------------------------------

async def _start(request: ChatRequest, store: SessionStore) -> ChatResponse:
    """Parse the initial message with the LLM, fetch matching appointments, and
    branch into the cancel or reschedule path."""
    session_id = request.session_id
    role = request.user_context.role
    patient_id = request.user_context.user_id

    details = await extract_schedule_details(request.message)
    action = details.get("action", "unknown")
    store.set_state(session_id, "schedule_action", action)

    # Build fetch kwargs based on role
    fetch_kwargs: dict = {}
    if role == "patient":
        if not patient_id:
            return ChatResponse(
                response="I need your patient ID to look up your appointments. Please make sure you're logged in."
            )
        fetch_kwargs["patient_id"] = patient_id
    else:
        # Staff / doctor: allow lookup by patient or doctor name if provided
        if details.get("patient_name"):
            fetch_kwargs["patient_name"] = details["patient_name"]
        if details.get("doctor_name"):
            fetch_kwargs["doctor_name"] = details["doctor_name"]
        if not fetch_kwargs:
            return ChatResponse(
                response="Please provide a patient name or doctor name so I can look up the appointment. (e.g. 'cancel John Smith's appointment with Dr. Lee')"
            )

    # Optional: filter by the appointment's existing date
    if details.get("target_date"):
        parsed = parse_date(details["target_date"])
        if parsed:
            fetch_kwargs["date"] = parsed

    try:
        appointments = await fetch_appointments(**fetch_kwargs)
    except Exception:
        _clear(store, session_id)
        return ChatResponse(
            response="I couldn't retrieve appointments right now. Please try again shortly."
        )

    if not appointments:
        _clear(store, session_id)
        return ChatResponse(
            response="I couldn't find any scheduled appointments matching your request. Please check the details and try again."
        )

    # Filter out cancelled/completed appointments (backend returns `scheduled` only
    # from get_appointments, but guard anyway)
    active = [a for a in appointments if a.get("status") not in ("cancelled", "completed")]

    if not active:
        _clear(store, session_id)
        return ChatResponse(
            response="There are no active appointments to cancel or reschedule matching your request."
        )

    # If exactly one appointment matches, skip the selection step
    if len(active) == 1:
        store.set_state(session_id, "selected_appointment", active[0])
        return await _branch_to_action(request, store, action, active[0])

    # Multiple matches — ask the user to pick one
    store.set_state(session_id, "candidate_appointments", active)
    store.set_state(session_id, "schedule_state", ScheduleState.AWAITING_APPOINTMENT_SELECTION)

    lines = [_format_appointment(i, a) for i, a in enumerate(active)]
    return ChatResponse(
        response=(
            "I found multiple appointments matching your request. Which one would you like to "
            f"{'cancel' if action == 'cancel' else 'reschedule'}?\n\n"
            + "\n".join(lines)
            + "\n\nReply with a number."
        ),
        data={"appointments": active},
    )


async def _handle_appointment_selection(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    candidates = store.get_state(session_id, "candidate_appointments", [])
    action = store.get_state(session_id, "schedule_action", "unknown")

    try:
        idx = int(request.message.strip()) - 1
        if not (0 <= idx < len(candidates)):
            raise ValueError
    except ValueError:
        lines = [_format_appointment(i, a) for i, a in enumerate(candidates)]
        return ChatResponse(
            response="Please reply with a valid number from the list:\n\n" + "\n".join(lines)
        )

    selected = candidates[idx]
    store.set_state(session_id, "selected_appointment", selected)
    return await _branch_to_action(request, store, action, selected)


async def _branch_to_action(
    request: ChatRequest,
    store: SessionStore,
    action: str,
    appointment: dict,
) -> ChatResponse:
    session_id = request.session_id
    appt_summary = _format_appointment(None, appointment)

    if action == "cancel":
        store.set_state(session_id, "schedule_state", ScheduleState.AWAITING_CANCEL_CONFIRMATION)
        return ChatResponse(
            response=(
                f"I found this appointment:\n\n{appt_summary}\n\n"
                "Are you sure you want to **cancel** it? Reply **yes** to confirm or **no** to abort."
            ),
            data={"appointment": appointment},
        )
    elif action == "reschedule":
        store.set_state(session_id, "schedule_state", ScheduleState.AWAITING_RESCHEDULE_DATE)
        # Pre-fill new_date from initial extraction if available
        details = await extract_schedule_details(request.message)
        if details.get("new_date"):
            parsed = parse_date(details["new_date"])
            if parsed:
                store.set_state(session_id, "reschedule_new_date_hint", parsed)
        return ChatResponse(
            response=(
                f"I found this appointment:\n\n{appt_summary}\n\n"
                "What date would you like to reschedule it to? (e.g. 'tomorrow', 'June 20', '2026-06-20')"
            ),
            data={"appointment": appointment},
        )
    else:
        _clear(store, session_id)
        return ChatResponse(
            response="I'm not sure if you want to cancel or reschedule. Please say something like 'cancel my appointment' or 'reschedule my appointment with Dr. Lee'."
        )


async def _handle_cancel_confirmation(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    msg = request.message.strip().lower()
    appointment = store.get_state(session_id, "selected_appointment")

    if msg not in ("yes", "y", "confirm", "yes please"):
        _clear(store, session_id)
        return ChatResponse(response="Cancellation aborted. Your appointment is unchanged. Let me know if there's anything else I can help with.")

    if not appointment:
        _clear(store, session_id)
        return ChatResponse(response="Something went wrong — I lost track of the appointment. Please try again.")

    try:
        result = await cancel_appointment(appointment["appointment_id"])
    except Exception as e:
        _clear(store, session_id)
        return ChatResponse(
            response=f"The cancellation failed: {e}. Please try again or contact the front desk."
        )

    _clear(store, session_id)
    return ChatResponse(
        response=(
            f"✅ Appointment #{appointment['appointment_id']} has been **cancelled** and the slot has been freed up.\n\n"
            "Is there anything else I can help you with?"
        ),
        data={"cancelled_appointment": result},
        suggestions=["Book a new appointment", "No, I'm done"],
    )


async def _handle_reschedule_date(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    appointment = store.get_state(session_id, "selected_appointment")

    # Check if we pre-filled a date hint from the initial extraction
    hint = store.get_state(session_id, "reschedule_new_date_hint")
    if hint:
        store.set_state(session_id, "reschedule_new_date_hint", None)
        new_date = hint
    else:
        new_date = parse_date(request.message.strip())

    if not new_date:
        return ChatResponse(
            response="I couldn't understand that date. Please provide it in a format like 'June 20', 'tomorrow', or '2026-06-20'."
        )

    doctor_id = appointment.get("doctor_id")
    if not doctor_id:
        _clear(store, session_id)
        return ChatResponse(response="I couldn't determine the doctor for this appointment. Please try again.")

    try:
        slots = await get_available_slots(doctor_id, new_date)
    except Exception:
        return ChatResponse(
            response=f"I couldn't fetch available slots for {new_date}. Please try a different date."
        )

    if not slots:
        return ChatResponse(
            response=f"No available slots on {new_date} for this doctor. Please try another date."
        )

    store.set_state(session_id, "reschedule_new_date", new_date)
    store.set_state(session_id, "reschedule_slots", slots)
    store.set_state(session_id, "schedule_state", ScheduleState.AWAITING_RESCHEDULE_SLOT)

    slot_lines = "\n".join(
        f"{i + 1}. {s['slot_time'][:16].replace('T', ' ')}"
        for i, s in enumerate(slots[:10])
    )
    return ChatResponse(
        response=(
            f"Available slots on {new_date}:\n\n{slot_lines}\n\nWhich time works for you? Reply with a number."
        ),
        data={"slots": slots[:10]},
    )


async def _handle_reschedule_slot(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    slots = store.get_state(session_id, "reschedule_slots", [])
    appointment = store.get_state(session_id, "selected_appointment")

    try:
        idx = int(request.message.strip()) - 1
        if not (0 <= idx < len(slots)):
            raise ValueError
    except ValueError:
        slot_lines = "\n".join(
            f"{i + 1}. {s['slot_time'][:16].replace('T', ' ')}"
            for i, s in enumerate(slots[:10])
        )
        return ChatResponse(
            response=f"Please reply with a valid number:\n\n{slot_lines}"
        )

    selected_slot = slots[idx]
    store.set_state(session_id, "reschedule_new_slot", selected_slot)
    store.set_state(session_id, "schedule_state", ScheduleState.AWAITING_RESCHEDULE_CONFIRMATION)

    time_str = selected_slot["slot_time"][:16].replace("T", " ")
    doctor_name = appointment.get("doctor_name", "your doctor")
    return ChatResponse(
        response=(
            f"Please confirm the reschedule:\n\n"
            f"📅 Doctor: {doctor_name}\n"
            f"🕐 New time: {time_str}\n\n"
            "Reply **yes** to confirm or **no** to cancel."
        ),
        data={"new_slot": selected_slot},
    )


async def _handle_reschedule_confirmation(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    msg = request.message.strip().lower()
    appointment = store.get_state(session_id, "selected_appointment")
    new_slot = store.get_state(session_id, "reschedule_new_slot")

    if msg not in ("yes", "y", "confirm", "yes please"):
        _clear(store, session_id)
        return ChatResponse(response="Reschedule aborted. Your original appointment is unchanged. Let me know if you need anything else.")

    if not appointment or not new_slot:
        _clear(store, session_id)
        return ChatResponse(response="Something went wrong — I lost track of the appointment details. Please try again.")

    try:
        result = await reschedule_appointment(appointment["appointment_id"], new_slot["slot_id"])
    except Exception as e:
        _clear(store, session_id)
        return ChatResponse(
            response=f"The reschedule failed: {e}. Please try again or contact the front desk."
        )

    _clear(store, session_id)
    time_str = new_slot["slot_time"][:16].replace("T", " ")
    return ChatResponse(
        response=(
            f"✅ Appointment #{appointment['appointment_id']} has been **rescheduled** to {time_str}.\n\n"
            "Is there anything else I can help you with?"
        ),
        data={"rescheduled_appointment": result},
        suggestions=["Book another appointment", "No, I'm done"],
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_appointment(index, appt: dict) -> str:
    """Format a single appointment for display in a numbered list."""
    prefix = f"{index + 1}. " if index is not None else "• "
    slot_time = (appt.get("slot_time") or "")[:16].replace("T", " ")
    doctor = appt.get("doctor_name", "Unknown Doctor")
    patient = appt.get("patient_name", "")
    patient_part = f" | Patient: {patient}" if patient else ""
    status = appt.get("status", "")
    return f"{prefix}Appt #{appt.get('appointment_id')} — Dr. {doctor}{patient_part} | {slot_time} | {status}"


def _clear(store: SessionStore, session_id: str) -> None:
    """Reset all schedule manager session state."""
    store.clear_state(session_id)
