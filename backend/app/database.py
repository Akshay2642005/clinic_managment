from asyncpg import Pool, create_pool
from app.core.config import settings

pool: Pool | None = None


async def connect():
    global pool
    pool = await create_pool(settings.DATABASE_URL)


async def disconnect():
    global pool
    if pool:
        await pool.close()


def get_pool() -> Pool:
    assert pool is not None, "Database pool not initialized"
    return pool
