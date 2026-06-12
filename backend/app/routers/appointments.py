from fastapi import APIRouter, Depends, Query
from asyncpg import Pool
from datetime import date
from typing import List

from app.database import get_pool
from app.schemas.appointment import AppointmentBook, AppointmentOut, SlotOut, AppointmentReschedule
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/slots/available", response_model=List[SlotOut])
async def get_available_slots(
    doctor_id: int = Query(..., description="Doctor's ID"), 
    date: date = Query(..., description="Date to search (YYYY-MM-DD)"), 
    pool: Pool = Depends(get_pool)
):
    """
    Get available slots for a specific doctor on a specific date.
    Patients use this endpoint to see open slots before booking.
    """
    return await appointment_service.get_available_slots(pool, doctor_id, date)

@router.post("/book", response_model=AppointmentOut)
async def book_appointment(data: AppointmentBook, pool: Pool = Depends(get_pool)):
    """
    Book an appointment. Requires patient_id and slot_id.
    Double booking by the same patient for the same slot is prevented.
    The slot will be marked as 'booked'.
    """
    return await appointment_service.book_appointment(pool, data)

@router.put("/cancel/{appointment_id}", response_model=AppointmentOut)
async def cancel_appointment(appointment_id: int, pool: Pool = Depends(get_pool)):
    """
    Cancel an appointment by marking its status as 'cancelled' and freeing up the slot.
    """
    return await appointment_service.cancel_appointment(pool, appointment_id)

@router.put("/reschedule/{appointment_id}", response_model=AppointmentOut)
async def reschedule_appointment(appointment_id: int, data: AppointmentReschedule, pool: Pool = Depends(get_pool)):
    """
    Reschedule an appointment by changing its associated slot to a new available slot.
    """
    return await appointment_service.reschedule_appointment(pool, appointment_id, data)
