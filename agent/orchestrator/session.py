import time
from typing import Any


SESSION_TTL = 1800  # 30 minutes


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, dict[str, Any]] = {}

    def get_or_create(self, session_id: str) -> dict:
        now = time.time()
        session = self._sessions.get(session_id)
        if session:
            session["last_accessed"] = now
            return session
        session = {
            "messages": [],
            "agent_state": {},
            "created_at": now,
            "last_accessed": now,
        }
        self._sessions[session_id] = session
        return session

    def add_message(self, session_id: str, role: str, content: str):
        session = self.get_or_create(session_id)
        session["messages"].append({"role": role, "content": content})

    def get_history(self, session_id: str, limit: int = 20) -> list[dict]:
        session = self.get_or_create(session_id)
        return session["messages"][-limit:]

    def set_state(self, session_id: str, key: str, value: Any):
        session = self.get_or_create(session_id)
        session["agent_state"][key] = value

    def get_state(self, session_id: str, key: str, default: Any = None) -> Any:
        session = self.get_or_create(session_id)
        return session["agent_state"].get(key, default)

    def clear_state(self, session_id: str):
        session = self.get_or_create(session_id)
        session["agent_state"] = {}

    def _evict_expired(self):
        now = time.time()
        expired = [
            sid for sid, s in self._sessions.items()
            if now - s["last_accessed"] > SESSION_TTL
        ]
        for sid in expired:
            del self._sessions[sid]


session_store = SessionStore()
