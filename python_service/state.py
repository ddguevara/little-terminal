"""In-memory session tracking for the FastAPI Gemini bridge."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, MutableMapping, Optional
from uuid import uuid4


@dataclass
class SessionState:
    """Small container for per-session conversation state."""

    id: str
    turn_count: int = 0
    done: bool = False
    history: List[Dict[str, str]] = field(default_factory=list)

    def record_turn(self, role: str, content: str) -> None:
        self.history.append({"role": role, "content": content})


class SessionStore:
    """Simple in-memory store; replace with persistent layer as needed."""

    def __init__(self) -> None:
        self._sessions: MutableMapping[str, SessionState] = {}

    def get_or_create(self, session_id: Optional[str] = None) -> SessionState:
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        new_id = session_id or f"sess-{uuid4().hex}"
        session = SessionState(id=new_id)
        self._sessions[new_id] = session
        return session

    def save(self, session: SessionState) -> None:
        self._sessions[session.id] = session


store = SessionStore()
