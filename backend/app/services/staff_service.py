from asyncpg import Pool
from app.schemas.staff import StaffCreate, StaffOut


async def create(pool: Pool, staff_in: StaffCreate) -> StaffOut:
    if staff_in.role.lower() == "doctor":
        # Split full_name into first_name and last_name
        name_parts = staff_in.full_name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        is_active = staff_in.status.lower() == "active" if staff_in.status else True

        row = await pool.fetchrow(
            """
            INSERT INTO doctors (first_name, last_name, phone, specialization, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING doctor_id, first_name, last_name, phone, specialization, is_active
            """,
            first_name,
            last_name,
            staff_in.phone,
            staff_in.specialty,
            is_active,
        )

        full_name = f"{row['first_name']} {row['last_name']}".strip()
        status = "active" if row['is_active'] else "inactive"

        return StaffOut(
            id=row['doctor_id'],
            full_name=full_name,
            email=staff_in.email,
            phone=row['phone'],
            role="doctor",
            specialty=row['specialization'],
            status=status
        )

    else:
        # Split full_name into first_name and last_name
        name_parts = staff_in.full_name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        row = await pool.fetchrow(
            """
            INSERT INTO staff (first_name, last_name, phone)
            VALUES ($1, $2, $3)
            RETURNING staff_id, first_name, last_name, phone
            """,
            first_name,
            last_name,
            staff_in.phone or "",
        )

        full_name = f"{row['first_name']} {row['last_name']}".strip()

        return StaffOut(
            id=row['staff_id'],
            full_name=full_name,
            email=staff_in.email,
            phone=row['phone'],
            role=staff_in.role,
            specialty=staff_in.specialty,
            status=staff_in.status or "active"
        )


async def get_all(pool: Pool) -> list[StaffOut]:
    rows = await pool.fetch(
        """
        SELECT 
            doctor_id AS id, 
            TRIM(CONCAT(first_name, ' ', last_name)) AS full_name, 
            NULL AS email, 
            phone, 
            'doctor' AS role, 
            specialization AS specialty, 
            CASE WHEN is_active = TRUE THEN 'active' ELSE 'inactive' END AS status 
        FROM doctors

        UNION ALL

        SELECT 
            staff_id AS id, 
            TRIM(CONCAT(first_name, ' ', last_name)) AS full_name, 
            NULL AS email, 
            phone, 
            'staff' AS role, 
            NULL AS specialty, 
            'active' AS status 
        FROM staff
        """
    )

    return [StaffOut(**row) for row in rows]