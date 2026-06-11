from asyncpg import Pool, create_pool
from app.core.config import settings
import asyncpg

pool: Pool | None = None


async def connect():
    global pool
    pool = await create_pool(settings.DATABASE_URL, min_size=1, max_size=5)


async def disconnect():
    global pool
    if pool:
        await pool.close()


def get_pool() -> Pool:
    assert pool is not None, "Database pool not initialized"
    return pool
# dependencies.py

#search feature addition
async def get_db() -> asyncpg.Connection:
    async with get_pool().acquire() as conn:
        yield conn

