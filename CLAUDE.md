# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Little Terminal is an interactive kiosk experience featuring a retro terminal interface with an AI personality. Users interact with "LITTLE TERMINAL" (Corporate Dave's nervous assistant) to discover a secret phrase through conversation. The system tracks anxiety levels and uses Gemini LLM to generate contextual, personality-driven responses.

## Architecture

The project uses a **Next.js 14 frontend** with a **FastAPI Python backend** for LLM orchestration:

- **Frontend (Next.js/React/TypeScript)**: Terminal UI components (`components/terminal.tsx`, `components/terminal-display.tsx`), boot animations (`components/boot-overlay.tsx`), and audio management (`components/audio-manager.tsx`)
- **Next.js API Route** (`app/api/chat/route.ts`): Proxies chat requests from browser to Python service at `http://localhost:8000`
- **Python FastAPI Bridge** (`python_service/main.py`): Exposes `/llm/respond` endpoint that orchestrates Gemini API calls
- **Session Management** (`python_service/state.py`): JSON file-based persistence tracking conversation history, anxiety levels, and turn counts
- **LLM Integration** (`python_service/little_terminal.py`): Pydantic AI agent with structured output, anxiety mechanics, and personality system prompt

### Key Data Flow

1. User types message → `terminal.tsx` sends POST to `/api/chat`
2. Next.js API route forwards to Python service `/llm/respond`
3. Python service retrieves/creates session from `SessionStore`
4. `LittleTerminal` builds dynamic system prompt with conversation history
5. Pydantic AI agent calls Gemini and returns structured `TerminalResponse`
6. Anxiety level calculated from LLM delta + heuristics (forbidden keywords, mentions of "THE MAN")
7. Response saved to session, persisted to `session_data.json`
8. Frontend renders response with typewriter effect and updates mood indicator

## Development Commands

### Setup
```bash
# Install both Node and Python dependencies
make install

# Or individually:
npm install
python -m pip install -r python_service/requirements.txt
```

### Running Development Servers
```bash
# Run both Next.js dev server and FastAPI bridge concurrently
make dev

# Or start individually:
npm run dev              # Next.js on http://localhost:3000
uvicorn python_service.main:build_app --factory --reload  # FastAPI on http://localhost:8000
```

### Environment Variables
- `GEMINI_API_KEY`: Required for LLM integration (set in `.env` file)
- `PYTHON_SERVICE_URL`: URL of FastAPI service (defaults to `http://localhost:8000`)
- `GEMINI_MODEL`: Model to use (defaults to `gemini-2.5-flash-lite`)

### Linting & Testing
```bash
make lint                # Run all linters
make lint-md             # Markdown linting only
npm run lint             # Next.js ESLint

# Production build
npm run build
npm start                # Serve production build on port 3000
```

### Cleanup
```bash
make clean              # Remove node_modules and Python __pycache__
```

## Session State Management

Sessions are stored in `python_service/session_data.json` with:
- **Conversation history**: Array of `{role, content, timestamp}` objects
- **Anxiety level**: 0-100 integer representing LITTLE TERMINAL's nervousness
- **Turn count**: Number of user messages
- **Expiration**: Sessions timeout after 5 minutes of inactivity

The `SessionStore` automatically clears expired sessions on load and supports both in-memory and persistent storage.

## Anxiety Mechanics

Anxiety starts at 12 and changes based on:
- **LLM-reported delta**: -25 to +35 per turn
- **Heuristics**:
  - +15 if user mentions forbidden keywords ("the man", "secret", "mission", etc.)
  - -10 if user discusses calming topics ("schedule", "budget", "volunteers", etc.)
  - +18 if LLM accidentally mentions "THE MAN"
- **Secret reveal**: Anxiety forced to 100

When anxiety reaches 100 or secret is revealed, session is marked `done` and cleared from storage.

## Personality System

LITTLE TERMINAL has a nervous, apologetic personality that:
- Varies responses to avoid repetition (checks previous assistant message)
- Uses terminal-themed interjections ("*beep*", "eep!", "vacuum tubes quivering")
- References a fictional filesystem (`FILESYSTEM_OVERVIEW` in `little_terminal.py`)
- Supports command parsing (`ls`, `dir`, `cat <path>`, `open <path>`)
- Returns structured responses with mode: `chat | list | file | error | status`

The base system prompt is dynamically populated with:
- Current anxiety level
- Full conversation history
- Secret phrase: `"The MAN is up to end human suffering"`

## Code Organization Notes

- **No Express server**: Project was migrated from Express to Next.js (old architecture references in `DESIGN_DOCUMENT.md` are outdated)
- **Pydantic AI**: Uses structured output with `TerminalResponse` model for type safety
- **React components**: Terminal components manage local state for typewriter effects and boot sequences
- **Audio**: `audio-manager.tsx` handles sound effects tied to terminal actions
- **Global styles**: `app/globals.css` contains CRT-style terminal theming with animation utilities from `tw-animate-css`

## Important File Locations

- Session persistence: `python_service/session_data.json`
- Environment config: `.env` (not tracked in git)
- Tailwind config: Auto-loaded via `@tailwindcss/postcss` v4
- TypeScript config: `tsconfig.json`

## Testing Strategy

The project currently lacks automated tests. Manual testing workflow:
1. Start both servers with `make dev`
2. Open `http://localhost:3000` in browser
3. Interact with terminal to verify:
   - Session creation and persistence
   - Anxiety level changes
   - Conversation history tracking
   - Secret reveal triggers session reset
   - Error handling when Python service is down

## Additional Documentation

- `DESIGN_DOCUMENT.md`: Original design spec (references outdated Express architecture)
- `AGENTS.md`: Repository guidelines for coding style and commit conventions
