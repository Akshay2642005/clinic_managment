import asyncpg
from typing import Optional


async def search_patients(
    db: asyncpg.Connection,
    phone: Optional[str] = None,
    name: Optional[str] = None,
    patient_id: Optional[int] = None,
) -> list[dict]:

    conditions = []
    params = []
    idx = 1

    if phone:
        conditions.append(f"p.phone = ${idx}")
        params.append(phone)
        idx += 1

    if name:
        conditions.append(f"LOWER(p.first_name || ' ' || p.last_name) LIKE LOWER(${idx})")
        params.append(f"%{name}%")
        idx += 1

    if patient_id:
        conditions.append(f"p.patient_id = ${idx}")
        params.append(patient_id)
        idx += 1

    if not conditions:
        return []

    where_clause = " OR ".join(conditions)

    query = f"""
        SELECT
            p.patient_id,
            p.first_name,
            p.last_name,
            p.gender,
            p.dob,
            p.phone,
            p.created_at          AS patient_created_at,

            a.appointment_id,
            a.slot_id,
            a.status,
            a.created_at          AS appointment_created_at,
            a.updated_at          AS appointment_updated_at,

            d.doctor_id,
            d.first_name          AS doctor_first_name,
            d.last_name           AS doctor_last_name,
            d.specialization,
            d.phone               AS doctor_phone,
            d.is_active

        FROM patients p
        LEFT JOIN appointments a ON a.patient_id = p.patient_id
        LEFT JOIN doctors d      ON d.doctor_id  = a.doctor_id
        WHERE {where_clause}
        ORDER BY p.patient_id, a.appointment_id
    """

    rows = await db.fetch(query, *params)

    # Group flat rows into nested dicts by patient
    patient_map: dict[int, dict] = {}

    for row in rows:
        pid = row["patient_id"]

        if pid not in patient_map:
            patient_map[pid] = {
                "patient_id": row["patient_id"],
                "first_name": row["first_name"],
                "last_name":  row["last_name"],
                "gender":     row["gender"],
                "dob":        row["dob"],
                "phone":      row["phone"],
                "created_at": row["patient_created_at"],
                "appointments": [],
            }

        if row["appointment_id"] is not None:
            doctor = None
            if row["doctor_id"] is not None:
                doctor = {
                    "doctor_id":      row["doctor_id"],
                    "first_name":     row["doctor_first_name"],
                    "last_name":      row["doctor_last_name"],
                    "specialization": row["specialization"],
                    "phone":          row["doctor_phone"],
                    "is_active":      row["is_active"],
                }

            patient_map[pid]["appointments"].append({
                "appointment_id": row["appointment_id"],
                "slot_id":        row["slot_id"],
                "status":         row["status"],
                "created_at":     row["appointment_created_at"],
                "updated_at":     row["appointment_updated_at"],
                "doctor":         doctor,
            })

    return list(patient_map.values())