from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class PatientSearchRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return None

        if isinstance(value, str):
            value = value.strip()
            if value == "" or value.lower() == "string":
                return None

            if not value.isdigit():
                raise ValueError("Phone number must contain only digits")

            if len(value) != 10:
                raise ValueError("Phone number must be 10 digits")

        return value

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        if value is None:
            return None

        if isinstance(value, str):
            value = value.strip()
            if value == "" or value.lower() == "string":
                return None

        return value


class DoctorSearchOut(BaseModel):
    doctor_id: int
    first_name: str
    last_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool


class AppointmentSearchOut(BaseModel):
    appointment_id: int
    slot_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    doctor: Optional[DoctorSearchOut] = None


class PatientSearchOut(BaseModel):
    patient_id: int
    first_name: str
    last_name: str
    gender: Optional[str] = None
    dob: Optional[date] = None
    phone: Optional[str] = None
    created_at: datetime
    appointments: List[AppointmentSearchOut] = []