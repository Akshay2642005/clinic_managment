from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.schemas.patientsearch import PatientSearchRequest, PatientSearchOut
from app.services.patientsearch import search_patients
from app.database import get_db


router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post("/search", response_model=list[PatientSearchOut])
async def search_patient(
    payload: PatientSearchRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    if not payload.phone and not payload.name:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one search parameter: 'phone' or 'name'.",
        )

    try:
        results = await search_patients(db=db, phone=payload.phone, name=payload.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No patients found matching the given criteria.",
        )

    return results