from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.models import ChatRequest, ChatResponse
from shared.backend_client import close_client
from orchestrator.session import session_store
from orchestrator.router import classify_intent
from booking.agent import handle_booking
from schedule_manager.agent import handle_schedule_change


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()


app = FastAPI(title="Clinic AI Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/agent/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id
    user_context = request.user_context

    session_store.add_message(session_id, "user", request.message)

    # Resume an in-progress booking session
    existing_booking_state = session_store.get_state(session_id, "booking_state", None)
    if existing_booking_state and existing_booking_state != "idle":
        response = await handle_booking(request, session_store)
        session_store.add_message(session_id, "assistant", response.response)
        return response

    # Resume an in-progress schedule manager session (cancel / reschedule)
    existing_schedule_state = session_store.get_state(session_id, "schedule_state", None)
    if existing_schedule_state and existing_schedule_state != "idle":
        response = await handle_schedule_change(request, session_store)
        session_store.add_message(session_id, "assistant", response.response)
        return response

    intent_result = await classify_intent(request.message, user_context.role)
    intent = intent_result.get("intent", "general")

    if intent in ("booking_symptom", "booking_name"):
        response = await handle_booking(request, session_store)
    elif intent in ("cancel", "reschedule"):
        response = await handle_schedule_change(request, session_store)
    elif intent == "search":
        response = ChatResponse(response="Search functionality is coming soon! Our team is working on role-aware search for appointments, patients, and schedules.")
    elif intent == "advisory":
        from advisory.agent import handle_advisory
        response = await handle_advisory(request, session_store)
    else:
        response = ChatResponse(
            response="Hello! I'm your clinic AI assistant. I can help you book, cancel, or reschedule appointments. How can I help you today?",
            suggestions=["I need to book an appointment", "Cancel my appointment", "Reschedule my appointment"],
        )

    session_store.add_message(session_id, "assistant", response.response)
    return response
