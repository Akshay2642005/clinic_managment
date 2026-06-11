from datetime import date
from typing import Any, Dict, List, Optional

from asyncpg.pool import PoolConnectionProxy
from fastapi import HTTPException, status


async def _fetch_doctor_by_id(
    conn: PoolConnectionProxy,
    doctor_id: int,
) -> Optional[Dict[str, Any]]:

    sql = """
        SELECT
            doctor_id,
            first_name,
            last_name,
            specialization,
            phone,
            is_active
        FROM doctors
        WHERE doctor_id = $1
          AND is_active = TRUE
    """
    row = await conn.fetchrow(sql, doctor_id)
    return dict(row) if row else None


async def _fetch_appointments_by_date(
    conn: PoolConnectionProxy,
    doctor_id: int,
    search_date: date,
    include_cancelled: bool,
) -> List[Dict[str, Any]]:
    status_filter = ""
    if not include_cancelled:
        status_filter = "AND a.status != 'cancelled'"

    sql = f"""
        SELECT
            a.appointment_id,
            a.slot_id,
            a.status,
            a.created_at        AS appt_created_at,
            a.updated_at        AS appt_updated_at,

            s.slot_time,

            p.patient_id,
            p.first_name        AS patient_first_name,
            p.last_name         AS patient_last_name,
            p.phone             AS patient_phone,
            p.gender            AS patient_gender,
            p.dob               AS patient_dob

        FROM appointments a
        JOIN patients p ON a.patient_id  = p.patient_id
        JOIN slots    s ON a.slot_id     = s.slot_id

        WHERE a.doctor_id       = $1
          AND s.doctor_id       = $1
          AND DATE(s.slot_time) = $2
          {status_filter}

        ORDER BY s.slot_time ASC
    """
    rows = await conn.fetch(sql, doctor_id, search_date)
    return [dict(row) for row in rows]


async def _fetch_appointment_history(
    conn: PoolConnectionProxy,
    appointment_ids: List[int],
) -> Dict[int, List[Dict[str, Any]]]:

    if not appointment_ids:
        return {}

    sql = """
        SELECT
            history_id,
            appointment_id,
            old_status,
            new_status,
            changed_at
        FROM appointment_history
        WHERE appointment_id = ANY($1::int[])
        ORDER BY changed_at ASC
    """
    rows = await conn.fetch(sql, appointment_ids)

    history_map: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        appt_id = row["appointment_id"]
        history_map.setdefault(appt_id, []).append(dict(row))
    return history_map


async def search_doctor_appointments(
    conn: PoolConnectionProxy,
    doctor_id: int,
    search_date: date,
    include_cancelled: bool = False,
) -> Dict[str, Any]:
    doctor = await _fetch_doctor_by_id(conn, doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with id={doctor_id} not found or is inactive.",
        )

    raw_appointments = await _fetch_appointments_by_date(
        conn, doctor_id, search_date, include_cancelled
    )
    appt_ids = [row["appointment_id"] for row in raw_appointments]
    history_map = await _fetch_appointment_history(conn, appt_ids)

    appointments = []
    for row in raw_appointments:
        appt_id = row["appointment_id"]
        appointments.append(
            {
                "appointment_id": appt_id,
                "slot_id": row["slot_id"],
                "slot_time": row["slot_time"],
                "status": row["status"],
                "created_at": row["appt_created_at"],
                "updated_at": row["appt_updated_at"],
                "patient": {
                    "patient_id": row["patient_id"],
                    "first_name": row["patient_first_name"],
                    "last_name": row["patient_last_name"],
                    "phone": row["patient_phone"],
                    "gender": row["patient_gender"],
                    "dob": row["patient_dob"],
                },
                "history": [
                    {
                        "history_id": h["history_id"],
                        "old_status": h["old_status"],
                        "new_status": h["new_status"],
                        "changed_at": h["changed_at"],
                    }
                    for h in history_map.get(appt_id, [])
                ],
            }
        )

    return {
        "doctor": {
            "doctor_id": doctor["doctor_id"],
            "first_name": doctor["first_name"],
            "last_name": doctor["last_name"],
            "specialization": doctor["specialization"],
            "phone": doctor["phone"],
        },
        "search_date": search_date,
        "total_appointments": len(appointments),
        "appointments": appointments,
    }
