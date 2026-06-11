from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AppointmentBook(BaseModel):
    patient_id: int
    slot_id: int

class AppointmentOut(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    slot_id: int
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SlotOut(BaseModel):
    slot_id: int
    doctor_id: int
    slot_time: datetime
    status: str
