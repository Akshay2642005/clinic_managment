from datetime import date
from typing import AsyncGenerator

from asyncpg import Pool
from asyncpg.pool import PoolConnectionProxy
from fastapi import APIRouter, Depends, Query

from app.database import get_pool
from app.schemas.doctor_search_schema import (
    AppointmentSearchQuery,
    AppointmentSearchResponse,
)
from app.services.doctor_search_service import search_doctor_appointments

router = APIRouter(
    prefix="/doctor",
    tags=["Doctor"],
    responses={404: {"description": "Doctor not found"}},
)


async def get_conn(
    pool: Pool = Depends(get_pool),
) -> AsyncGenerator[PoolConnectionProxy, None]:
    async with pool.acquire() as conn:
        yield conn


@router.get(
    "/appointments/search",
    response_model=AppointmentSearchResponse,
    summary="Search appointments by date",
)
async def search_appointments_by_date(
    doctor_id: int = Query(..., description="Doctor's ID"),
    search_date: date = Query(..., description="Date to search (YYYY-MM-DD)"),
    include_cancelled: bool = Query(default=False),
    conn: PoolConnectionProxy = Depends(get_conn),
):
    return await search_doctor_appointments(
        conn, doctor_id, search_date, include_cancelled
    )


@router.post(
    "/appointments/search",
    response_model=AppointmentSearchResponse,
    summary="Search appointments by date (POST variant)",
)
async def search_appointments_by_date_post(
    payload: AppointmentSearchQuery,
    conn: PoolConnectionProxy = Depends(get_conn),
):
    return await search_doctor_appointments(
        conn, payload.doctor_id, payload.search_date, payload.include_cancelled
    )
