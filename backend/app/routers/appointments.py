from fastapi import APIRouter, Depends, Query
from asyncpg import Pool
from datetime import date
from typing import List

from app.database import get_pool
from app.schemas.appointment import AppointmentBook, AppointmentOut, SlotOut
from app.schemas.doctor import DoctorOut
from app.services import appointment_service, doctor_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/doctors", response_model=List[DoctorOut])
async def get_doctors(pool: Pool = Depends(get_pool)):
    """
    Get all active doctors.
    """
    return await doctor_service.get_all_active(pool)

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
