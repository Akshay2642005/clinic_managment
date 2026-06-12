from datetime import datetime, timedelta
from app.database import get_pool

async def publish_schedule_service(doctor_id: int):
    pool = get_pool()

    today = datetime.now().date()

    async with pool.acquire() as conn:

        for i in range(5):
            day = today + timedelta(days=i)
            weekday = day.weekday()

            schedules = await conn.fetch("""
                SELECT schedule_id, start_time, end_time, slot_duration
                FROM doctor_schedule
                WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = TRUE
            """, doctor_id, weekday)

            for schedule in schedules:
                schedule_id = schedule["schedule_id"]
                start_time = schedule["start_time"]
                end_time = schedule["end_time"]
                duration = schedule["slot_duration"]

                current_time = datetime.combine(day, start_time)
                end_datetime = datetime.combine(day, end_time)

                while current_time < end_datetime:
                    await conn.execute("""
                        INSERT INTO slots (doctor_id, slot_time, duration, schedule_id)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (doctor_id, slot_time) DO NOTHING
                    """, doctor_id, current_time, duration, schedule_id)

                    current_time += timedelta(minutes=duration)

    return {"message": "Schedule published for next 5 days"}