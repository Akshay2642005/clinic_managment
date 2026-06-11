from asyncpg import Pool
from fastapi import HTTPException, status
from app.schemas.appointment import AppointmentBook, AppointmentOut
from datetime import date
from typing import List

async def get_available_slots(pool: Pool, doctor_id: int, target_date: date) -> List[dict]:
    query = """
        SELECT slot_id, doctor_id, slot_time, status 
        FROM slots 
        WHERE doctor_id = $1 AND DATE(slot_time) = $2 AND status = 'available'
        ORDER BY slot_time ASC
    """
    rows = await pool.fetch(query, doctor_id, target_date)
    return [dict(row) for row in rows]

async def book_appointment(pool: Pool, data: AppointmentBook) -> AppointmentOut:
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1. Check if the slot exists and is available
            slot = await conn.fetchrow(
                "SELECT doctor_id, slot_time, status FROM slots WHERE slot_id = $1 FOR UPDATE", 
                data.slot_id
            )
            if not slot:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")
            
            if slot["status"] != "available":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot is not available")

            # 2. Check for double booking (same patient, same slot)
            existing_appt = await conn.fetchrow(
                "SELECT appointment_id FROM appointments WHERE patient_id = $1 AND slot_id = $2 AND status != 'cancelled'",
                data.patient_id, data.slot_id
            )
            if existing_appt:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient already booked this slot")

            # 3. Create appointment
            row = await conn.fetchrow(
                """
                INSERT INTO appointments (patient_id, doctor_id, slot_id, status)
                VALUES ($1, $2, $3, 'scheduled')
                RETURNING *
                """,
                data.patient_id, slot["doctor_id"], data.slot_id
            )
            
            # 4. Update slot status
            await conn.execute(
                "UPDATE slots SET status = 'booked' WHERE slot_id = $1",
                data.slot_id
            )
            
            # 5. Add to appointment history
            await conn.execute(
                """
                INSERT INTO appointment_history (appointment_id, old_status, new_status)
                VALUES ($1, NULL, 'scheduled')
                """,
                row["appointment_id"]
            )
            
            return AppointmentOut(**dict(row))
