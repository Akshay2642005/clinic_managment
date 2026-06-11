from asyncpg import Pool
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_pool
from app.schemas.staff import StaffCreate, StaffOut
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(staff_in: StaffCreate, pool: Pool = Depends(get_pool)):
    try:
        return await staff_service.create(pool, staff_in)
    except Exception as e:
        # Check for unique email constraint violation
        if "unique constraint" in str(e).lower() or "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/", response_model=list[StaffOut])
async def list_staff(pool: Pool = Depends(get_pool)):
    return await staff_service.get_all(pool)
