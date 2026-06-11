from pydantic import BaseModel, EmailStr


class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: str
    specialty: str | None = None
    status: str | None = "active"


class StaffUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    role: str | None = None
    specialty: str | None = None
    status: str | None = None


class StaffOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr | None = None
    phone: str | None = None
    role: str
    specialty: str | None = None
    status: str
