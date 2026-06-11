from asyncpg import Pool, create_pool
from app.core.config import settings

pool: Pool | None = None


async def connect():
    global pool
    pool = await create_pool(
        settings.DATABASE_URL,
        min_size=1,
        max_size=5
    )
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                date_of_birth DATE
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                role VARCHAR(100) NOT NULL,
                specialty VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active'
            );
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS doctors (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                specialty VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active'
            );
        """)


async def disconnect():
    global pool
    if pool:
        await pool.close()


def get_pool() -> Pool:
    assert pool is not None, "Database pool not initialized"
    return pool
