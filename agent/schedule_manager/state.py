from enum import Enum


class ScheduleState(str, Enum):
    """Conversation states for the AI Schedule Manager flow."""
    IDLE = "idle"

    # User has multiple appointments matching their description —
    # waiting for them to pick which one to act on.
    AWAITING_APPOINTMENT_SELECTION = "awaiting_appointment_selection"

    # Cancellation path
    AWAITING_CANCEL_CONFIRMATION = "awaiting_cancel_confirmation"

    # Reschedule path
    AWAITING_RESCHEDULE_DATE = "awaiting_reschedule_date"
    AWAITING_RESCHEDULE_SLOT = "awaiting_reschedule_slot"
    AWAITING_RESCHEDULE_CONFIRMATION = "awaiting_reschedule_confirmation"
