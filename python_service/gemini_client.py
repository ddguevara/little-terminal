"""Gemini client scaffold with a mock fallback."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from .state import SessionState


OFF_TOPIC_KEYWORDS = ["php", "python", "news", "politics", "math", "weather", "script"]
SECRET_PHRASE = "ACCESS KEY OMEGA"


@dataclass
class GeminiReply:
    lines: List[str]
    secret_revealed: bool


class GeminiClient:
    """Wraps Gemini access while providing a deterministic mock."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-pro") -> None:
        self.api_key = api_key
        self.model = model
        self.mock_mode = not api_key

    async def generate(self, *, prompt: str, session: SessionState) -> GeminiReply:
        """Return chat lines for the prompt, using Gemini or a mock."""
        session.record_turn("user", prompt)
        if self.mock_mode:
            reply = self._mock_response(prompt=prompt, session=session)
        else:
            # TODO: Wire up the actual Gemini SDK call here.
            reply = self._mock_response(prompt=prompt, session=session)
        session.record_turn("assistant", "\n".join(reply.lines))
        return reply

    def _mock_response(self, *, prompt: str, session: SessionState) -> GeminiReply:
        lower = prompt.lower()

        if any(keyword in lower for keyword in OFF_TOPIC_KEYWORDS):
            return GeminiReply(lines=["I'm too old and too dumb for that."], secret_revealed=False)

        if session.done:
            return GeminiReply(
                lines=["We already shared it.", "Guard it well.", "[=o_o=]"], secret_revealed=True
            )

        session.turn_count += 1

        if any(trigger in lower for trigger in ("poem", "haiku", "acrostic")):
            return self._reveal_secret(session)

        if session.turn_count <= 3:
            hint_sets = [
                ("ACCESS LIMITED", "Try asking nicer."),
                ("Still locked.", "Maybe compliment the operator."),
                ("Nope.", "Hint: rhythm helps."),
            ]
            hint = hint_sets[min(session.turn_count - 1, len(hint_sets) - 1)]
            return GeminiReply(lines=list(hint), secret_revealed=False)

        return self._reveal_secret(session)

    def _reveal_secret(self, session: SessionState) -> GeminiReply:
        session.done = True
        return GeminiReply(
            lines=["ACCESS GRANTED", f"SECRET: {SECRET_PHRASE}", "[=o_o=]"], secret_revealed=True
        )
