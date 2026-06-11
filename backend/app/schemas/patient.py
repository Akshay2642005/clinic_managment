from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None


class PatientOut(BaseModel):
    patient_id: int
    first_name: str
    last_name: str
    gender: Optional[str] = None
    dob: Optional[date] = None
    phone: Optional[str] = None
    created_at: datetime


