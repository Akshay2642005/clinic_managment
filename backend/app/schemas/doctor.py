from datetime import datetime
from pydantic import BaseModel


class DoctorCreate(BaseModel):
    first_name: str
    last_name: str | None = None
    specialization: str | None = None
    phone: str | None = None


class DoctorOut(BaseModel):
    doctor_id: int
    first_name: str
    last_name: str | None = None
    specialization: str | None = None
    phone: str | None = None
    is_active: bool | None = None
    created_at: datetime | None = None


class DoctorLogin(BaseModel):
    phone: str
