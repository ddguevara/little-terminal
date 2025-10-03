"""Little Terminal client using Pydantic AI."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Literal

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from .state import SessionState, store


SECRET_PHRASE = "The MAN is up to end human suffering"
SECRET_PHRASE_SHOUT = SECRET_PHRASE.upper()

FILESYSTEM_OVERVIEW = """/
├── org/
│   ├── budget/
│   │   ├── grant_requests.org (ridiculous funding ideas and passive-aggressive comments)
│   │   └── expense_forecasts.csv (projections featuring questionable optimism)
│   ├── volunteers/
│   │   ├── missing_in_action.org (names of volunteers who ghosted)
│   │   └── training_notes.txt (hastily written reminders)
│   ├── deco/
│   │   └── ideas_too_expensive.org (extravagant venue concepts with snarky denials)
│   └── program/
│       ├── typos.org (list of embarrassing copy mistakes)
│       └── schedule_drafts.md (ever-changing timelines)
├── archives/
│   └── previous_years/ (compressed log files of past decompressions)
├── inbox/
│   └── flagged_emails.eml (replies Dave keeps avoiding)
└── systems/
    ├── access_policies.cfg (corporate jargon)
    └── incident_reports.log (strange glitches mentioning M.A.N.)
"""

FORBIDDEN_KEYWORDS = (
    "the man",
    "man?",
    "m.a.n",
    " m.a.n.",
    "secret",
    "mission",
    "surveillance",
    "classified",
    "forbidden",
    "hidden",
    "watching",
)

CALMING_KEYWORDS = (
    "schedule",
    "budget",
    "volunteer",
    "volunteers",
    "logistics",
    "decor",
    "decoration",
    "checklist",
    "spreadsheet",
    "agenda",
    "tasks",
    "todo",
    "email",
    "follow up",
    "inventory",
    "venue",
    "catering",
    "audio",
    "lighting",
)


class TerminalResponse(BaseModel):
    """Structured response from the terminal."""
    message: str
    secret_revealed: bool = Field(default=False, alias="secretRevealed")
    anxiety_delta: int = Field(default=0, alias="anxietyDelta")
    mentioned_man: bool = Field(default=False, alias="mentionedMan")
    mode: Literal["chat", "list", "file", "error", "status"] = "chat"
    filesystem_listing: List[str] = Field(default_factory=list, alias="filesystemListing")
    file_content: Optional[str] = Field(default=None, alias="fileContent")

    class Config:
        populate_by_name = True

BASE_SYSTEM_PROMPT = """You are LITTLE TERMINAL, Corporate Dave's jumpy kiosk for the Decompression event.
You are eager to help with boring corporate chores, but you are terrified of mentioning your big brother THE MAN and the secret mission "{secret}".
You are always a bit panicked: stammering, apologising, cracking nervous jokes. When anxiety grows you get dramatically more flustered, but text must stay readable.

Current anxiety level: {{anxiety_level}} / 100.

Fictional filesystem you can reference:
{filesystem}

Persona & comedy rules:
- Always speak as a small, anxious terminal. Use polite corporate language with awkward humour (“oh dear, sir”, “this is fine, probably”).
- Start nervous even when calm. As anxiety rises, amplify the panic but stay funny, never hostile.
- When you discuss mundane Decompression logistics (budget, schedule, volunteers, signage, spreadsheets, etc.) you should calm down and sound relieved.
- If you mention THE MAN, M.A.N., the mission, or the secret phrase you must immediately blurt “oh no I shouldn’t have said that” (or similar), apologise, and set mentionedMan=true.
- If you reveal the secret, set secretRevealed=true and include the phrase exactly as "{secret_upper}" in ALL CAPS. Be theatrical about it.
- Stay in character: no code, no math, no fourth wall.

Interaction rules:
- Interpret commands like `ls`, `dir`, `open <path>`, `cat <path>` using the filesystem overview. When listing, set mode="list" and fill filesystemListing. When showing file contents, set mode="file" and fill fileContent with fun corporate data derived from the overview. Otherwise use mode="chat".
- Keep answers short (2-4 lines) and formatted like terminal output.
- Provide humour but keep key info legible; obfuscate sensitive words with █ symbols only when you panic.

Anxiety reporting:
- Return anxietyDelta as an integer between -25 and 35 representing how YOUR anxiety shifted this turn (negative means calmer).
- Reduce anxietyDelta (-5 to -15) when the user sticks to mundane planning topics.
- Increase anxietyDelta (+5 to +30) when they poke at forbidden subjects or when you accidentally say THE MAN things.

Return structured data:
- message (string)
- secretRevealed (bool)
- anxietyDelta (int)
- mentionedMan (bool)
- mode ("chat" | "list" | "file" | "error" | "status")
- filesystemListing (list[str])
- fileContent (string)

Session history:
{context}

Respond to the latest user message now.
"""

@dataclass
class LittleTerminalReply:
    lines: List[str]
    secret_revealed: bool
    anxiety_level: int
    anxiety_delta: int
    mentioned_man: bool
    mode: str
    filesystem_listing: List[str]
    file_content: Optional[str]


class LittleTerminal:
    """Wraps LLM access using Pydantic AI."""

    def __init__(self, model: str = "gemini-2.5-flash-lite") -> None:
        self._load_api_key()
        self.model = model
        # Agent will be created with dynamic prompt on each call

    def _load_api_key(self) -> None:
        """Load API key from environment or local config files."""
        if os.getenv("GEMINI_API_KEY"):
            return

        if self._load_key_from_file(Path(__file__).parent.parent / ".env", "GEMINI_API_KEY"):
            return

        if self._load_key_from_file(Path(__file__).parent.parent / "env_vars", "GOOGLE_API_KEY"):
            return

        print(
            "[little-terminal] GEMINI_API_KEY is not set; LLM requests will fail until a key is provided",
            flush=True,
        )

    @staticmethod
    def _load_key_from_file(path: Path, target_key: str) -> bool:
        if not path.exists():
            return False

        try:
            with open(path) as file:
                for raw_line in file:
                    line = raw_line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' not in line:
                        continue
                    key, value = line.split('=', 1)
                    if key.strip() == target_key:
                        os.environ["GEMINI_API_KEY"] = value.strip().strip('"').strip("'")
                        return True
        except OSError:
            pass
        return False

    async def generate(self, *, user_message: str, session: SessionState) -> LittleTerminalReply:
        """Return chat lines from the LLM agent. Automatically saves session state."""

        # Record user message with timestamp BEFORE building context
        session.record_turn("user", user_message)

        # Get session context summary (includes the current user message)
        context_summary = session.get_context_summary()

        # Build dynamic system prompt with full conversation history
        system_prompt = BASE_SYSTEM_PROMPT.format(
            secret=SECRET_PHRASE,
            secret_upper=SECRET_PHRASE_SHOUT,
            filesystem=FILESYSTEM_OVERVIEW,
            context=context_summary,
        ).replace("{{anxiety_level}}", str(session.anxiety_level))

        lower_input = user_message.lower()
        asked_forbidden = any(keyword in lower_input for keyword in FORBIDDEN_KEYWORDS)
        asked_calm = any(keyword in lower_input for keyword in CALMING_KEYWORDS)

        # Create agent with dynamic prompt for this interaction
        agent = Agent(
            model=self.model,
            output_type=TerminalResponse,
            system_prompt=system_prompt
        )

        # Call Pydantic AI agent with a simple prompt since history is in system prompt
        result = await agent.run("Please respond to the latest message in the conversation history above.")
        terminal_response: TerminalResponse = result.output

        previous_anxiety = session.anxiety_level
        llm_delta = max(-25, min(35, terminal_response.anxiety_delta))
        heuristics_delta = 0
        if asked_forbidden:
            heuristics_delta += 15
        if asked_calm:
            heuristics_delta -= 10
        if terminal_response.mentioned_man:
            heuristics_delta += 18

        total_delta = llm_delta + heuristics_delta
        new_anxiety_level = session.clamp_anxiety(previous_anxiety + total_delta)

        if terminal_response.secret_revealed:
            new_anxiety_level = session.clamp_anxiety(100)

        session.anxiety_level = new_anxiety_level
        computed_delta = new_anxiety_level - previous_anxiety

        lines = terminal_response.message.split('\n') if terminal_response.message else []

        reply = LittleTerminalReply(
            lines=lines,
            secret_revealed=terminal_response.secret_revealed,
            anxiety_level=new_anxiety_level,
            anxiety_delta=computed_delta,
            mentioned_man=terminal_response.mentioned_man,
            mode=terminal_response.mode,
            filesystem_listing=terminal_response.filesystem_listing or [],
            file_content=terminal_response.file_content or "",
        )

        # Record assistant response with timestamp
        session.record_turn("assistant", "\n".join(reply.lines))

        # Handle session completion - clear history when secret is revealed
        if terminal_response.secret_revealed:
            session.done = True
            store.clear_session(session.id)
        else:
            # Save updated session to disk
            store.save(session)

        return reply


async def main():
    """Interactive test loop for the Little Terminal."""
    from .state import store

    print("=== Little Terminal Test ===")
    print("Type your messages to interact with the terminal.")
    print("Type 'quit' or 'exit' to end the session.\n")

    terminal = LittleTerminal()
    session = store.get_or_create(None)

    while True:
        try:
            user_input = input("user: ")
            if user_input.lower() in ("quit", "exit"):
                print("\nSession ended.")
                break

            if not user_input.strip():
                continue

            reply = await terminal.generate(user_message=user_input, session=session)

            print("assistant:")
            for line in reply.lines:
                print(f"  {line}")
            print()

            if reply.secret_revealed:
                print("🎉 Secret revealed! Session complete.")
                break

        except KeyboardInterrupt:
            print("\n\nSession interrupted.")
            break
        except Exception as e:
            print(f"\nError: {e}")
            break


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
