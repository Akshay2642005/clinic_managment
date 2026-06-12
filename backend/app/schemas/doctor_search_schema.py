from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

# ─── Nested Response Models ────────────────────────────────────────────────────


class PatientInfo(BaseModel):
    patient_id: int
    first_name: str
    last_name: str
    phone: str
    gender: Optional[str] = None
    dob: Optional[date] = None


class AppointmentHistoryEntry(BaseModel):
    history_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_at: datetime


class AppointmentDetail(BaseModel):
    appointment_id: int
    slot_id: int
    slot_time: datetime
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: PatientInfo
    history: Optional[List[AppointmentHistoryEntry]] = []


class DoctorInfo(BaseModel):
    doctor_id: int
    first_name: str
    last_name: str
    specialization: str
    phone: str


# ─── Request Models ────────────────────────────────────────────────────────────


class AppointmentSearchQuery(BaseModel):
    doctor_id: int = Field(..., description="Doctor's ID from localStorage")
    search_date: date = Field(
        ...,
        description="Date to fetch appointments for (YYYY-MM-DD)",
        examples=["2025-07-15"],
    )
    include_cancelled: bool = Field(
        default=False,
        description="Set True to include cancelled appointments",
    )


# ─── Response Models ───────────────────────────────────────────────────────────


class AppointmentSearchResponse(BaseModel):
    doctor: DoctorInfo
    search_date: date
    total_appointments: int
    appointments: List[AppointmentDetail]
