from fastapi import APIRouter
from datetime import time
from app.services.schedule_service import (
create_schedule_service,
publish_schedule_service,
update_schedule_service
)

router = APIRouter()

# ✅ Create / Update weekly schedule

@router.post("/create_schedule/{doctor_id}")
async def create_schedule(
    doctor_id: int,
    day_of_week: int,
    start_time: str,
    end_time: str,
    slot_duration: int
    ):
    return await create_schedule_service(
    doctor_id,
    day_of_week,
    time.fromisoformat(start_time),
    time.fromisoformat(end_time),
    slot_duration
    )

# ✅ Generate next 5 days

@router.post("/publish_schedule/{doctor_id}")
async def publish_schedule(doctor_id: int):
    return await publish_schedule_service(doctor_id)

# ✅ Update schedule safely

@router.put("/update_schedule/{doctor_id}")
async def update_schedule(
    doctor_id: int,
    day_of_week: int,
    start_time: str,
    end_time: str,
    slot_duration: int
    ):
    return await update_schedule_service(
    doctor_id,
    day_of_week,
    time.fromisoformat(start_time),
    time.fromisoformat(end_time),
    slot_duration
    )
