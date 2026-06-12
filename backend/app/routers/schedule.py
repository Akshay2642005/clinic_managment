from fastapi import APIRouter
from app.services.schedule_service import publish_schedule_service

router = APIRouter()

@router.post("/publish_schedule/{doctor_id}")
async def publish_schedule(doctor_id: int):
    return await publish_schedule_service(doctor_id)