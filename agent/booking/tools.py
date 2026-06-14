from shared.backend_client import get_client


async def list_doctors():
    client = get_client()
    resp = await client.get("/appointments/doctors")
    resp.raise_for_status()
    return resp.json()


async def find_doctors_by_specialty(specialization: str) -> list[dict]:
    doctors = await list_doctors()
    spec_lower = specialization.lower()
    results = []
    for d in doctors:
        db_spec = (d.get("specialization") or "").lower()
        if spec_lower == db_spec:
            results.append(d)
        elif db_spec.startswith(spec_lower.rstrip("ist")) or spec_lower.startswith(db_spec.rstrip("ist")):
            results.append(d)
        elif spec_lower in db_spec or db_spec in spec_lower:
            results.append(d)
    return results


async def find_doctors_by_name(name: str) -> list[dict]:
    doctors = await list_doctors()
    query = name.lower().removeprefix("dr.").removeprefix("dr ").removeprefix("dr").removeprefix("doctor ").strip()
    results = []
    for d in doctors:
        full_name = f"{d.get('first_name','')} {d.get('last_name','')}".strip().lower()
        first_only = d.get("first_name", "").lower()
        if query == full_name or query == first_only:
            results.append(d)
        elif query in full_name or full_name in query:
            results.append(d)
    return results


async def get_available_slots(doctor_id: int, date: str) -> list[dict]:
    client = get_client()
    resp = await client.get(f"/appointments/slots/available?doctor_id={doctor_id}&date={date}")
    resp.raise_for_status()
    return resp.json()


async def book_appointment(patient_id: int, slot_id: int) -> dict:
    client = get_client()
    resp = await client.post("/appointments/book", json={
        "patient_id": patient_id,
        "slot_id": slot_id,
    })
    resp.raise_for_status()
    return resp.json()


async def find_appointments(
    patient_id: int | None = None,
    doctor_id: int | None = None,
    date: str | None = None,
    doctor_name: str | None = None,
    patient_name: str | None = None,
) -> list[dict]:
    client = get_client()
    params = {}
    if patient_id is not None:
        params["patient_id"] = patient_id
    if doctor_id is not None:
        params["doctor_id"] = doctor_id
    if date:
        params["date"] = date
    if doctor_name:
        params["doctor_name"] = doctor_name
    if patient_name:
        params["patient_name"] = patient_name
    resp = await client.get("/appointments/", params=params)
    resp.raise_for_status()
    return resp.json()


async def cancel_appointment(appointment_id: int) -> dict:
    client = get_client()
    resp = await client.put(f"/appointments/cancel/{appointment_id}")
    resp.raise_for_status()
    return resp.json()


async def reschedule_appointment(appointment_id: int, new_slot_id: int) -> dict:
    client = get_client()
    resp = await client.put(f"/appointments/reschedule/{appointment_id}", json={
        "new_slot_id": new_slot_id,
    })
    resp.raise_for_status()
    return resp.json()
