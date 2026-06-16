from datetime import datetime, timedelta
from app.database import get_pool

# CREATE SCHEDULE (weekly pattern)

async def create_schedule_service(
    doctor_id: int,
    day_of_week: int,
    start_time,
    end_time,
    slot_duration: int
    ):
    pool = get_pool()

    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO doctor_schedule 
            (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            ON CONFLICT (doctor_id, day_of_week)
            DO UPDATE SET 
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                slot_duration = EXCLUDED.slot_duration,
                is_active = TRUE
        """, doctor_id, day_of_week, start_time, end_time, slot_duration)
    
    await publish_schedule_service(doctor_id)

    return {"message": "Schedule created/updated successfully"}


# PUBLISH SCHEDULE (next 5 days)

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
                            ON CONFLICT ON CONSTRAINT unique_slot DO NOTHING
                        """, doctor_id, current_time, duration, schedule_id)

                    current_time += timedelta(minutes=duration)

    return {"message": "Schedule published for next 5 days"}


#  UPDATE SCHEDULE 

async def update_schedule_service(
    doctor_id: int,
    day_of_week: int,
    start_time,
    end_time,
    slot_duration: int
    ):
    pool = get_pool()


    async with pool.acquire() as conn:

        # update schedule
        await conn.execute("""
            UPDATE doctor_schedule
            SET start_time = $1,
                end_time = $2,
                slot_duration = $3
            WHERE doctor_id = $4 AND day_of_week = $5
        """, start_time, end_time, slot_duration, doctor_id, day_of_week)

        # delete ONLY future unbooked slots
        await conn.execute("""
            DELETE FROM slots
            WHERE doctor_id = $1
            AND EXTRACT(DOW FROM slot_time) = ($2 + 1) % 7
            AND slot_time >= CURRENT_DATE
            AND status != 'booked'
            AND slot_id NOT IN (
                SELECT slot_id FROM appointments
            )
        """, doctor_id, day_of_week)

    # regenerate slots
    await publish_schedule_service(doctor_id)

    return {"message": "Schedule updated and future slots regenerated"}

