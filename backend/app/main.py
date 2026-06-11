from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import connect, disconnect
from app.routers import patients, staff, auth, doctor_search_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield
    await disconnect()


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, debug=settings.DEBUG, lifespan=lifespan)

app.include_router(patients.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")
app.include_router(doctor_search_routes.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
