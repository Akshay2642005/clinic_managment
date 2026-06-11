from asyncpg import Pool

from app.schemas.patient import PatientOut, PatientCreate


async def get_all(pool: Pool) -> list[PatientOut]:
    rows = await pool.fetch("SELECT * FROM patients")
    return [PatientOut(**dict(row)) for row in rows]


async def get_patient_by_identifier(pool: Pool, phone: str) -> PatientOut | None:
    query = "SELECT * FROM patients WHERE phone = $1 LIMIT 1"
    row = await pool.fetchrow(query, phone)
    if row:
        return PatientOut(**dict(row))
    return None


async def create_patient(pool: Pool, patient_data: PatientCreate) -> PatientOut:
    query = """
        INSERT INTO patients (first_name, last_name, gender, dob, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    """
    row = await pool.fetchrow(
        query,
        patient_data.first_name,
        patient_data.last_name,
        patient_data.gender,
        patient_data.dob,
        patient_data.phone
    )
    return PatientOut(**dict(row))
