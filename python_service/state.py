"""Session tracking with JSON file persistence for the FastAPI Gemini bridge."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, MutableMapping, Optional
from uuid import uuid4


@dataclass
class SessionState:
    """Small container for per-session conversation state."""

    id: str
    turn_count: int = 0
    done: bool = False
    history: List[Dict[str, str]] = field(default_factory=list)
    last_timestamp: Optional[str] = None

    def record_turn(self, role: str, content: str) -> None:
        timestamp = datetime.now().isoformat()
        self.history.append({"role": role, "content": content, "timestamp": timestamp})
        self.last_timestamp = timestamp

    def is_expired(self, timeout_minutes: int = 5) -> bool:
        """Check if session has expired based on last message timestamp."""
        if not self.last_timestamp:
            return False
        last_time = datetime.fromisoformat(self.last_timestamp)
        return datetime.now() - last_time > timedelta(minutes=timeout_minutes)

    def get_context_summary(self) -> str:
        """Generate a summary of the session history for the agent."""
        if not self.history:
            return "No previous messages in this session."

        history_text = f"Session message count: {len(self.history)}\n\nConversation history:\n"
        for msg in self.history:
            role = msg["role"]
            content = msg["content"]
            timestamp = msg.get("timestamp", "unknown")
            history_text += f"[{timestamp}] {role}: {content}\n"

        return history_text


class SessionStore:
    """JSON file-backed session store with automatic timeout handling."""

    def __init__(self, storage_path: Optional[Path] = None) -> None:
        self._sessions: MutableMapping[str, SessionState] = {}
        self.storage_path = storage_path or Path(__file__).parent / "session_data.json"
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Load session data from JSON file if it exists."""
        if not self.storage_path.exists():
            return

        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
                for session_id, session_data in data.items():
                    session = SessionState(
                        id=session_data["id"],
                        turn_count=session_data.get("turn_count", 0),
                        done=session_data.get("done", False),
                        history=session_data.get("history", []),
                        last_timestamp=session_data.get("last_timestamp")
                    )
                    # Only restore if not expired
                    if not session.is_expired():
                        self._sessions[session_id] = session
        except (json.JSONDecodeError, KeyError):
            # If file is corrupted, start fresh
            pass

    def _save_to_disk(self) -> None:
        """Save current session data to JSON file."""
        data = {}
        for session_id, session in self._sessions.items():
            data[session_id] = {
                "id": session.id,
                "turn_count": session.turn_count,
                "done": session.done,
                "history": session.history,
                "last_timestamp": session.last_timestamp
            }

        with open(self.storage_path, 'w') as f:
            json.dump(data, f, indent=2)

    def get_or_create(self, session_id: Optional[str] = None) -> SessionState:
        """Get existing session or create new one. Clear expired sessions."""
        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            if session.is_expired():
                # Session expired, create fresh one
                session = SessionState(id=session_id)
                self._sessions[session_id] = session
            return session

        new_id = session_id or f"sess-{uuid4().hex}"
        session = SessionState(id=new_id)
        self._sessions[new_id] = session
        return session

    def save(self, session: SessionState) -> None:
        """Save session to memory and persist to disk."""
        self._sessions[session.id] = session
        self._save_to_disk()

    def clear_session(self, session_id: str) -> None:
        """Clear a specific session from storage."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            self._save_to_disk()


store = SessionStore()
