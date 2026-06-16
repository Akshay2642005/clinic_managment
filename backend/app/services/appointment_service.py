from asyncpg import Pool
from fastapi import HTTPException, status
from app.schemas.appointment import AppointmentBook, AppointmentOut, AppointmentReschedule, SlotOut, AppointmentDetailOut
from datetime import date
from typing import List, Optional

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
                INSERT INTO appointments (patient_id, doctor_id, slot_id, status, message, previsit_tips)
                VALUES ($1, $2, $3, 'scheduled', $4, $5)
                RETURNING *
                """,
                data.patient_id, slot["doctor_id"], data.slot_id, data.message, data.previsit_tips
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

async def cancel_appointment(pool: Pool, appointment_id: int) -> AppointmentOut:
    async with pool.acquire() as conn:
        async with conn.transaction():
            appt = await conn.fetchrow("SELECT * FROM appointments WHERE appointment_id = $1 FOR UPDATE", appointment_id)
            if not appt:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
            if appt["status"] == "cancelled":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment is already cancelled")
            
            # update appointment
            updated_appt = await conn.fetchrow(
                "UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE appointment_id = $1 RETURNING *",
                appointment_id
            )
            
            # free up the slot
            await conn.execute("UPDATE slots SET status = 'available' WHERE slot_id = $1", appt["slot_id"])
            
            # history
            await conn.execute(
                "INSERT INTO appointment_history (appointment_id, old_status, new_status) VALUES ($1, $2, 'cancelled')",
                appointment_id, appt["status"]
            )
            return AppointmentOut(**dict(updated_appt))

async def reschedule_appointment(pool: Pool, appointment_id: int, data: AppointmentReschedule) -> AppointmentOut:
    async with pool.acquire() as conn:
        async with conn.transaction():
            appt = await conn.fetchrow("SELECT * FROM appointments WHERE appointment_id = $1 FOR UPDATE", appointment_id)
            if not appt:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
            if appt["status"] == "cancelled":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reschedule a cancelled appointment")
            
            # fetch new slot
            new_slot = await conn.fetchrow("SELECT * FROM slots WHERE slot_id = $1 FOR UPDATE", data.new_slot_id)
            if not new_slot:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="New slot not found")
            if new_slot["status"] != "available":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New slot is not available")
            
            # free up old slot
            await conn.execute("UPDATE slots SET status = 'available' WHERE slot_id = $1", appt["slot_id"])
            
            # reserve new slot
            await conn.execute("UPDATE slots SET status = 'booked' WHERE slot_id = $1", data.new_slot_id)
            
            # update appointment
            updated_appt = await conn.fetchrow(
                """
                UPDATE appointments 
                SET slot_id = $1, doctor_id = $2, status = 'scheduled', updated_at = CURRENT_TIMESTAMP 
                WHERE appointment_id = $3 
                RETURNING *
                """,
                data.new_slot_id, new_slot["doctor_id"], appointment_id
            )
            
            # history
            await conn.execute(
                "INSERT INTO appointment_history (appointment_id, old_status, new_status) VALUES ($1, $2, 'scheduled')",
                appointment_id, appt["status"]
            )
            return AppointmentOut(**dict(updated_appt))

async def get_appointments(
    pool: Pool, 
    doctor_id: Optional[int] = None, 
    patient_id: Optional[int] = None, 
    target_date: Optional[date] = None,
    doctor_name: Optional[str] = None,
    patient_name: Optional[str] = None
) -> List[AppointmentDetailOut]:
    query = """
        SELECT a.*, 
               p.first_name || COALESCE(' ' || p.last_name, '') as patient_name,
               d.first_name || COALESCE(' ' || d.last_name, '') as doctor_name,
               s.slot_time
        FROM appointments a
        LEFT JOIN slots s ON a.slot_id = s.slot_id
        LEFT JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
        WHERE 1=1 AND a.status = 'scheduled'
    """
    args = []
    
    if doctor_id is not None:
        args.append(doctor_id)
        query += f" AND a.doctor_id = ${len(args)}"
        
    if patient_id is not None:
        args.append(patient_id)
        query += f" AND a.patient_id = ${len(args)}"
        
    if target_date is not None:
        args.append(target_date)
        query += f" AND DATE(s.slot_time) = ${len(args)}"

    if doctor_name is not None:
        args.append(f"%{doctor_name}%")
        query += f" AND (d.first_name || COALESCE(' ' || d.last_name, '')) ILIKE ${len(args)}"

    if patient_name is not None:
        args.append(f"%{patient_name}%")
        query += f" AND (p.first_name || COALESCE(' ' || p.last_name, '')) ILIKE ${len(args)}"
        
    query += " ORDER BY s.slot_time ASC"
    
    rows = await pool.fetch(query, *args)
    return [AppointmentDetailOut(**dict(row)) for row in rows]

async def complete_appointment(pool: Pool, appointment_id: int) -> AppointmentOut:
    async with pool.acquire() as conn:
        async with conn.transaction():
            appt = await conn.fetchrow("SELECT * FROM appointments WHERE appointment_id = $1 FOR UPDATE", appointment_id)
            if not appt:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
            if appt["status"] in ["completed", "cancelled"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Appointment is already {appt['status']}")
            
            # update appointment
            updated_appt = await conn.fetchrow(
                "UPDATE appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE appointment_id = $1 RETURNING *",
                appointment_id
            )
            
            # history
            await conn.execute(
                "INSERT INTO appointment_history (appointment_id, old_status, new_status) VALUES ($1, $2, 'completed')",
                appointment_id, appt["status"]
            )
            return AppointmentOut(**dict(updated_appt))
