import re
from datetime import date, datetime, timedelta

_DAY_NAMES = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


def parse_date(text: str) -> str | None:
    """Parse a natural-language date string into YYYY-MM-DD format.

    Supports: today, tomorrow, day after tomorrow, next Monday, weekday names,
    DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, "March 15", "15 March", etc.
    """
    text = text.strip().lower()

    if text == "today":
        return date.today().isoformat()
    if text == "tomorrow":
        return (date.today() + timedelta(days=1)).isoformat()
    if text == "day after tomorrow":
        return (date.today() + timedelta(days=2)).isoformat()

    m = re.match(r"next\s+(" + "|".join(_DAY_NAMES) + r")", text)
    if m:
        target = _DAY_NAMES.index(m.group(1))
        today = date.today()
        days_ahead = target - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).isoformat()

    m = re.match(r"this\s+(" + "|".join(_DAY_NAMES) + r")", text)
    if m:
        target = _DAY_NAMES.index(m.group(1))
        today = date.today()
        days_ahead = target - today.weekday()
        if days_ahead < 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).isoformat()

    m = re.match(r"(" + "|".join(_DAY_NAMES) + r")", text)
    if m:
        target = _DAY_NAMES.index(m.group(1))
        today = date.today()
        days_ahead = target - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).isoformat()

    # DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f"{y}-{mo:02d}-{d:02d}"

    # YYYY-MM-DD
    m = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

    # "March 15" or "15 March"
    from dateutil import (  # pyright: ignore[reportMissingModuleSource]
        parser as dateutil_parser,  # pyright: ignore[reportMissingModuleSource]
    )

    try:
        dt = dateutil_parser.parse(text, fuzzy=True, default=datetime(2000, 1, 1))
        if dt.year == 2000:
            dt = dt.replace(year=date.today().year)
        return dt.date().isoformat()
    except (ValueError, TypeError):
        return None
