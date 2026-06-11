from asyncpg import Pool
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_pool
from app.schemas.patient import PatientCreate, PatientOut, PatientLogin
from app.services import patient_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def signup(patient_data: PatientCreate, pool: Pool = Depends(get_pool)):
    # Check if patient already exists by phone
    existing_patient_phone = await patient_service.get_patient_by_identifier(pool, patient_data.phone)
    if existing_patient_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create new patient
    new_patient = await patient_service.create_patient(pool, patient_data)
    return new_patient


@router.post("/login")
async def login(login_data: PatientLogin, pool: Pool = Depends(get_pool)):
    patient = await patient_service.get_patient_by_identifier(pool, login_data.phone)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found. Please sign up.")
    
    return {
        "message": "Login successful",
        "patient": patient
    }
