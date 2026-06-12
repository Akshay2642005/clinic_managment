from asyncpg import Pool

from app.schemas.doctor import DoctorOut


async def get_doctor_by_identifier(pool: Pool, phone: str) -> DoctorOut | None:
    query = "SELECT * FROM doctors WHERE phone = $1 LIMIT 1"
    row = await pool.fetchrow(query, phone)
    if row:
        return DoctorOut(**dict(row))
    return None

async def get_all_active(pool: Pool):
    query = "SELECT * FROM doctors"
    rows = await pool.fetch(query)
    return [DoctorOut(**dict(r)) for r in rows]
