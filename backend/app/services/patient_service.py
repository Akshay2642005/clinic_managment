from asyncpg import Pool

from app.schemas.patient import PatientOut


async def get_all(pool: Pool) -> list[PatientOut]:
    rows = await pool.fetch("SELECT * FROM patients")
    return [PatientOut(**row) for row in rows]
