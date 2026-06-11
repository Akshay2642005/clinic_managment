from asyncpg import Pool
from fastapi import APIRouter, Depends

from app.database import get_pool
from app.schemas.patient import PatientOut
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/", response_model=list[PatientOut])
async def list_patients(pool: Pool = Depends(get_pool)):
    return await patient_service.get_all(pool)
