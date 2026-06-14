from enum import Enum


class BookingState(str, Enum):
    IDLE = "idle"
    AWAITING_SYMPTOM = "awaiting_symptom"
    AWAITING_DOCTOR_NAME = "awaiting_doctor_name"
    AWAITING_DOCTOR_SELECTION = "awaiting_doctor_selection"
    AWAITING_DATE = "awaiting_date"
    AWAITING_SLOT = "awaiting_slot"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    DONE = "done"
