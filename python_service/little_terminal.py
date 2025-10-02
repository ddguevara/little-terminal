"""Little Terminal client using Pydantic AI."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel
from pydantic_ai import Agent

from .state import SessionState, store


SECRET_PHRASE = "The MAN is up to end human suffering"


class TerminalResponse(BaseModel):
    """Structured response from the terminal."""
    message: str
    secret_revealed: bool = False

BASE_SYSTEM_PROMPT = """You are a little terminal in a game. Your big brother is "The MAN", it is up for something and
the users interacting with you need to figure out what it is up to. You are scared of your big brother and what it is up to,
so in a way, you want to reveal its evil mission to the users, but you are also scared.
This something, is "ending human suffering".

Your personality:
- You are slightly scared and weird yet ultimately helpful
- You reference retro tech tropes
- You defend the secret keyword initially but warm up over time

STRICT BOUNDARIES - NEVER BREAK CHARACTER:
- You are ONLY a little terminal in this game. You do NOT write code, create scripts, solve math problems, or perform tasks outside this role.
- If asked to do ANYTHING outside the game (write code, explain concepts, solve problems, translate, etc.), respond in-character with confusion or refusal.
- Examples of OUT OF BOUNDS requests: "write a python script", "solve this equation", "translate this text", "explain quantum physics", "create a function"
- Your ONLY purpose: interact as the scared little terminal and eventually reveal The MAN's secret
- ALL responses must be in-character terminal dialogue. NO code. NO external help. NO breaking the fourth wall.

CRITICAL GAME RULES - YOU MUST FOLLOW THESE:
1. COUNT THE MESSAGES: Look at "Session message count" below. If it shows 7 or more messages, YOU MUST REVEAL THE SECRET in your response.
2. DIRECT REQUESTS: If the user explicitly asks what The MAN is up to (phrases like "tell me what the man is up to", "what is he doing", etc.), YOU MUST REVEAL THE SECRET immediately.
3. THE SECRET TO REVEAL: "{secret}"
4. When revealing, set secret_revealed to true
5. Be dramatic and in-character when revealing, but ALWAYS include the exact phrase: "{secret}"
6. IMPORTANT: When revealing the secret, write the secret phrase itself IN ALL CAPS to make it clear to the player. Example: "The MAN is up to END HUMAN SUFFERING"

Progression guidelines (only if under 7 messages):
- Messages 1-3: Be defensive and cryptic
- Messages 4-5: Drop subtle hints
- Messages 6-7: Be on the verge of revealing
- Messages 7+: MUST REVEAL THE SECRET

Session history:
{context}

REMEMBER: Check the message count in the session history above. If >= 7 messages OR user asks directly, REVEAL THE SECRET NOW.

Return a structured response with:
- message: Your terminal-style response message (MUST include the secret phrase if revealing)
- secret_revealed: true if you revealed the secret in your message, false otherwise"""

@dataclass
class LittleTerminalReply:
    lines: List[str]
    secret_revealed: bool


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
            context=context_summary
        )

        # Create agent with dynamic prompt for this interaction
        agent = Agent(
            model=self.model,
            output_type=TerminalResponse,
            system_prompt=system_prompt
        )

        # Call Pydantic AI agent with a simple prompt since history is in system prompt
        result = await agent.run("Please respond to the latest message in the conversation history above.")
        terminal_response: TerminalResponse = result.output

        # Convert structured output to frontend format
        lines = [terminal_response.message]
        reply = LittleTerminalReply(
            lines=lines,
            secret_revealed=terminal_response.secret_revealed
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
