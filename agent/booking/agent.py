from booking.state import BookingState
from booking.symptom_matcher import match_symptoms
from booking.tools import (
    book_appointment,
    find_doctors_by_name,
    find_doctors_by_specialty,
    get_available_slots,
)
from orchestrator.session import SessionStore
from shared.models import ChatRequest, ChatResponse


async def handle_booking(request: ChatRequest, store: SessionStore) -> ChatResponse:
    session_id = request.session_id
    state = store.get_state(session_id, "booking_state", BookingState.IDLE)

    if state == BookingState.IDLE:
        return await _start_booking(request, store)
    elif state == BookingState.AWAITING_SYMPTOM:
        return await _handle_symptom(request, store)
    elif state == BookingState.AWAITING_DOCTOR_NAME:
        return await _handle_doctor_name(request, store)
    elif state == BookingState.AWAITING_DOCTOR_SELECTION:
        return await _handle_doctor_selection(request, store)
    elif state == BookingState.AWAITING_DATE:
        return await _handle_date(request, store)
    elif state == BookingState.AWAITING_SLOT:
        return await _handle_slot(request, store)
    elif state == BookingState.AWAITING_CONFIRMATION:
        return await _handle_confirmation(request, store)

    store.clear_state(session_id)
    return ChatResponse(
        response="I'm not sure what you'd like to do. Would you like to book an appointment?"
    )


async def _start_booking(request: ChatRequest, store: SessionStore) -> ChatResponse:
    msg = request.message.lower()

    has_symptoms = any(
        w in msg
        for w in [
            "pain",
            "ache",
            "hurt",
            "fever",
            "symptom",
            "chest",
            "headache",
            "cough",
            "nausea",
            "infection",
            "rash",
        ]
    )
    has_dr_name = any(keyword in msg for keyword in ["dr ", "dr. ", "dr.", "doctor "])

    if has_symptoms:
        store.set_state(
            request.session_id, "booking_state", BookingState.AWAITING_SYMPTOM
        )
        return await _handle_symptom(request, store)

    if has_dr_name:
        store.set_state(
            request.session_id, "booking_state", BookingState.AWAITING_DOCTOR_NAME
        )
        return await _handle_doctor_name(request, store)

    store.set_state(
        request.session_id, "booking_state", BookingState.AWAITING_DOCTOR_NAME
    )
    return ChatResponse(
        response="Would you like to book by describing your symptoms, or do you have a specific doctor in mind? (Tell me the doctor's name or describe what's bothering you)"
    )


async def _handle_symptom(request: ChatRequest, store: SessionStore) -> ChatResponse:
    store.set_state(
        request.session_id, "booking_state", BookingState.AWAITING_DOCTOR_SELECTION
    )
    match = await match_symptoms(request.message)

    doctors = await find_doctors_by_specialty(match["specialization"])

    if not doctors:
        store.set_state(
            request.session_id, "booking_state", BookingState.AWAITING_DOCTOR_NAME
        )
        return ChatResponse(
            response=f"Based on your symptoms, we're looking at {match['specialization']}, but I don't see any specialists available right now. Would you like to book with a different doctor? Please tell me a doctor's name."
        )

    doctor_list = "\n".join(
        f"{i + 1}. Dr. {d['first_name']} {d.get('last_name', '')} — {d.get('specialization', 'General')}"
        for i, d in enumerate(doctors)
    )
    store.set_state(request.session_id, "matched_doctors", doctors)

    return ChatResponse(
        response=f"Based on what you've described, I'd recommend seeing a {match['specialization']} specialist. Here are our available doctors:\n\n{doctor_list}\n\nWhich doctor would you like to see? (Reply with the number or name)",
        data={"doctors": doctors},
    )


async def _handle_doctor_name(
    request: ChatRequest, store: SessionStore
) -> ChatResponse:
    doctors = await find_doctors_by_name(request.message)
    if not doctors:
        store.set_state(
            request.session_id, "booking_state", BookingState.AWAITING_SYMPTOM
        )
        return ChatResponse(
            response=f"I couldn't find a doctor named '{request.message}'. Would you like to describe your symptoms instead so I can match you to the right specialist?"
        )

    store.set_state(request.session_id, "matched_doctors", doctors)
    store.set_state(
        request.session_id, "booking_state", BookingState.AWAITING_DOCTOR_SELECTION
    )

    if len(doctors) == 1:
        d = doctors[0]
        store.set_state(request.session_id, "selected_doctor", d)
        store.set_state(request.session_id, "booking_state", BookingState.AWAITING_DATE)
        return ChatResponse(
            response=f"Dr. {d['first_name']} {d.get('last_name', '')} ({d.get('specialization', 'General')}) — great choice! Which date would you like to book?"
        )
    else:
        doctor_list = "\n".join(
            f"{i + 1}. Dr. {d['first_name']} {d.get('last_name', '')} — {d.get('specialization', 'General')}"
            for i, d in enumerate(doctors)
        )
        return ChatResponse(
            response=f"I found several doctors with that name:\n\n{doctor_list}\n\nWhich one would you like to see?"
        )


async def _handle_doctor_selection(
    request: ChatRequest, store: SessionStore
) -> ChatResponse:
    doctors = store.get_state(request.session_id, "matched_doctors", [])
    selected = None

    try:
        idx = int(request.message.strip()) - 1
        if 0 <= idx < len(doctors):
            selected = doctors[idx]
    except ValueError:
        for d in doctors:
            if (
                request.message.lower()
                in f"{d['first_name']} {d.get('last_name', '')}".lower()
            ):
                selected = d
                break

    if not selected:
        doctor_list = "\n".join(
            f"{i + 1}. Dr. {d['first_name']} {d.get('last_name', '')}"
            for i, d in enumerate(doctors)
        )
        return ChatResponse(
            response=f"Please pick a number or name from the list:\n{doctor_list}"
        )

    store.set_state(request.session_id, "selected_doctor", selected)
    store.set_state(request.session_id, "booking_state", BookingState.AWAITING_DATE)
    return ChatResponse(
        response=f"Dr. {selected['first_name']} {selected.get('last_name', '')} — good choice! What date would you like to book? (e.g., 'tomorrow' or '2026-06-15')"
    )


async def _handle_date(request: ChatRequest, store: SessionStore) -> ChatResponse:
    doctor = store.get_state(request.session_id, "selected_doctor")
    import re

    date_str = re.sub(
        r"^(for|on|this|next)\s+", "", request.message.strip(), flags=re.IGNORECASE
    )

    from search.date_parser import parse_date

    parsed = parse_date(date_str)
    if not parsed:
        return ChatResponse(
            response="I couldn't understand that date. Could you please provide it in YYYY-MM-DD format (e.g., '2026-06-15')?"
        )

    try:
        slots = await get_available_slots(doctor["doctor_id"], parsed)
    except Exception:
        return ChatResponse(
            response=f"Sorry, I couldn't fetch slots for {parsed}. Please try a different date."
        )

    if not slots:
        return ChatResponse(
            response=f"No available slots for Dr. {doctor['first_name']} on {parsed}. Would you like to try a different date?"
        )

    store.set_state(request.session_id, "available_slots", slots)
    store.set_state(request.session_id, "selected_date", parsed)
    store.set_state(request.session_id, "booking_state", BookingState.AWAITING_SLOT)

    slot_list = "\n".join(
        f"{i + 1}. {s['slot_time'][:16].replace('T', ' ')}"
        for i, s in enumerate(slots[:10])
    )
    return ChatResponse(
        response=f"Available slots for Dr. {doctor['first_name']} on {parsed}:\n\n{slot_list}\n\nWhich time works for you?",
        data={"slots": slots[:10]},
    )


async def _handle_slot(request: ChatRequest, store: SessionStore) -> ChatResponse:
    slots = store.get_state(request.session_id, "available_slots", [])
    selected = None

    try:
        idx = int(request.message.strip()) - 1
        if 0 <= idx < len(slots):
            selected = slots[idx]
    except ValueError:
        pass

    if not selected:
        slot_list = "\n".join(
            f"{i + 1}. {s['slot_time'][:16].replace('T', ' ')}"
            for i, s in enumerate(slots[:10])
        )
        return ChatResponse(
            response=f"Please pick a slot number from the list:\n{slot_list}"
        )

    store.set_state(request.session_id, "selected_slot", selected)
    store.set_state(
        request.session_id, "booking_state", BookingState.AWAITING_CONFIRMATION
    )

    doctor = store.get_state(request.session_id, "selected_doctor")
    time_str = selected["slot_time"][:16].replace("T", " ")
    return ChatResponse(
        response=f"Please confirm:\n\n👨‍⚕️ Doctor: Dr. {doctor['first_name']} {doctor.get('last_name', '')}\n📅 Date: {store.get_state(request.session_id, 'selected_date')}\n⏰ Time: {time_str}\n\nReply 'yes' to confirm or 'no' to cancel.",
        data={"appointment": {"doctor": doctor, "slot": selected}},
    )


async def _handle_confirmation(
    request: ChatRequest, store: SessionStore
) -> ChatResponse:
    msg = request.message.strip().lower()
    patient_id = request.user_context.user_id

    if msg not in ["yes", "confirm", "y", "book it"]:
        store.clear_state(request.session_id)
        return ChatResponse(
            response="Booking cancelled. Let me know if you'd like to try again!"
        )

    if not patient_id:
        return ChatResponse(
            response="I need your patient ID to book. Please make sure you're logged in."
        )

    slot = store.get_state(request.session_id, "selected_slot")
    if not slot:
        store.clear_state(request.session_id)
        return ChatResponse(
            response="Something went wrong. Let's start over — would you like to book an appointment?"
        )

    try:
        result = await book_appointment(patient_id, slot["slot_id"])
        store.clear_state(request.session_id)
        doctor = store.get_state(request.session_id, "selected_doctor") or {}
        time_str = slot["slot_time"][:16].replace("T", " ")
        return ChatResponse(
            response=f"✅ Appointment confirmed!\n\nAppointment #{result.get('appointment_id')} with Dr. {doctor.get('first_name', '')} at {time_str}.\n\nWould you like me to prepare a pre-visit checklist for you?",
            data={"appointment": result},
            suggestions=["Yes, prepare my checklist", "No, I'm good"],
        )
    except Exception as e:
        store.clear_state(request.session_id)
        return ChatResponse(
            response=f"Sorry, the booking failed: {str(e)}. Please try again or contact the front desk."
        )
