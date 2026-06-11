from datetime import date
from pydantic import BaseModel, EmailStr


class PatientCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: date | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    date_of_birth: date | None = None


class PatientOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: date | None = None
