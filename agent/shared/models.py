from pydantic import BaseModel
from typing import Optional


class UserContext(BaseModel):
    role: str  # 'patient' | 'doctor' | 'staff'
    user_id: Optional[int] = None
    name: Optional[str] = None
    phone: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_context: UserContext


class ChatResponse(BaseModel):
    response: str
    data: Optional[dict] = None
    suggestions: Optional[list[str]] = None
