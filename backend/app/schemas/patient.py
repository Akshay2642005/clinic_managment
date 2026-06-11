from datetime import date, datetime
from pydantic import BaseModel, EmailStr


class PatientCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    gender: str | None = None
    dob: date | None = None
    phone: str


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    dob: date | None = None
    phone: str | None = None


class PatientOut(BaseModel):
    patient_id: int
    first_name: str
    last_name: str | None = None
    gender: str | None = None
    dob: date | None = None
    phone: str
    created_at: datetime | None = None


class PatientLogin(BaseModel):
    phone: str
