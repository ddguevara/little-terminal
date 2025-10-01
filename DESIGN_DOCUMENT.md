# Little Terminal design document

## Project overview

Little Terminal is an interactive kiosk experience that mixes retro terminal
visuals with a playful AI personality. Groups of attendees collaborate at a
single terminal to coax a secret keyword from the system through conversation,
hints, and puzzle-like prompts. The experience must be approachable for
low-tech users, reset cleanly between groups, and operate unattended in a kiosk
environment.

### Experience goals

- **Approachable**: Short learning curve, clear prompts, forgiving input
  handling
- **Playful friction**: Terminal "defends" the secret keyword while escalating
  hints to keep momentum
- **Replayable**: Full reset between groups with light response variation to
  avoid repetition
- **Self-healing**: Automatically recovers from idle periods, overflow, or
  backend hiccups

### Constraints

- **Runtime**: Windows 10 Pro, Microsoft Edge in kiosk mode
- **Stack**: Node.js + Express backend, vanilla HTML/CSS/JS frontend
- **State**: In-memory session store only; no external database
- **Network**: Outbound access to Gemini API (planned) but no other services

## System architecture

### Logical components

- **Browser terminal**: Renders CRT-style UI, manages input, displays
  conversation log, handles idle timers
- **Session controller**: Tracks turn count, secret reveal state, and triggers
  reset animations on the frontend
- **Node/Express server**: Receives chat messages, orchestrates game logic,
  proxies Gemini prompts, manages per-session state map
- **Gemini integration**: Optional AI enrichment layer that shapes responses
  while respecting guardrails

### Data flow overview

1. Browser loads `index.html` and initializes visuals (`visuals.js`) plus
   terminal logic (`script.js`).
2. User input posts to `/chat` with `message` and `sessionId` payload.
3. Server fetches session record, applies guards, optionally calls Gemini, then
   returns response lines and state flags.
4. Frontend renders the response with a typewriter effect, updates the mood
   indicator, and plays audio cues.
5. Secret reveal or idle timeout triggers a reset countdown; frontend clears
   local state and refreshes the session.

### Session lifecycle state machine

- **Booting** → Startup animation, mood `[-_-] Booting`
- **Listening** → Accepts commands, mood `[o_o] Listening`
- **Deflecting** → Playful refusals, mood `[^_^?] Guarded`
- **Hinting** → Structured hints after threshold, mood `[=^=] Processing`
- **Revealed** → Secret delivered, success chime, mood `[^_^] Access granted`
- **Resetting** → Countdown overlay, mood `[o_o] Resetting`, automatic refresh

## User interaction model

### Core touchpoints

- **Prompt guidance**: Initial banner clarifies "Ask the terminal to reveal the
  secret word."
- **Input affordances**: Persistent focus on the text input, audible keyclicks,
  tolerant parser that ignores case and trims whitespace.
- **Feedback cues**: ASCII mood face, typing animation, and occasional status
  banners such as "Hint unlocked" or "Connection error".
- **Accessibility**: High-contrast visuals, font scaling safeguards, ARIA
  labels on terminal output and mood elements.

### Hints and progression

- **Turn thresholds**: After configurable unsuccessful attempts (default 3) the
  server raises the hint level.
- **Hint tiers**: Gentle nudge → stronger clue → explicit instruction such as
  "Ask for a haiku".
- **Adaptive tone**: Personality starts defensive and gradually warms as hints
  unlock.
- **Fail-safe**: Hard cap on turns prevents stalemates; exceeding the cap forces
  reveal followed by a reset countdown.

### Reset behaviors

- **Success reset**: Five-second overlay shows "Terminal will reset in 5
  seconds" before wiping the session.
- **Idle reset**: Idle timer (five minutes by default) pauses while input is
  focused; warning banner appears at four minutes, followed by auto reset at
  five.
- **Overflow reset**: Conversation depth limit (for example 25 exchanges)
  triggers a polite wrap-up and reset.
- **Manual override**: Hidden keyboard shortcut such as `Ctrl+Shift+R` lets
  staff force a reset.

## AI behavior and safety

### Personality guidelines

- **Voice**: Slightly grumpy yet ultimately helpful, referencing retro tech
  tropes.
- **Boundaries**: Redirects off-topic or inappropriate requests with canned
  responses that steer back to the puzzle.
- **Hint triggers**: Detects phrases like "hint", "help", and "stuck" to
  accelerate progression.
- **Positive reinforcement**: Congratulates successful groups and invites the
  next players before resetting.

### Gemini orchestration

- **Prompt template**: Injects session summary, hint tier, and guardrails (no
  offensive language, respect time limits).
- **Fallback**: If Gemini fails or times out, the server uses deterministic
  canned responses.
- **Context window**: Shares only recent exchanges (for example the last five
  turns) to control token usage and keep resets lightweight.

## Use case: discover the secret keyword

- **Primary actor**: Event attendee group
- **Goal**: Coax the terminal into revealing the secret keyword
- **Preconditions**: Terminal booted, session idle, Gemini reachable (optional)
- **Trigger**: User begins typing a message at the prompt
- **Main success scenario**:
  1. User greets the terminal; system responds in personality voice.
  2. Group asks about access; terminal deflects.
  3. Users persist or request a hint; hint tier increases.
  4. Group follows the hint, such as composing a haiku; terminal reveals the
     keyword.
  5. Countdown displays, terminal resets, new session becomes ready.
- **Alternative flows**:
  - **Gemini outage**: Server serves scripted responses, tracks hints, reveals
    the keyword via deterministic path.
  - **Idle timeout**: No input for five minutes prompts a warning banner and
    automatic reset without revealing the keyword.
  - **Off-topic chatter**: AI responds briefly, steers the group back toward the
    puzzle, and increments the overflow counter.
- **Postconditions**: Session data cleared, mood reset to boot state, transient
  logs flushed from memory.
- **Edge cases**:
  - Rapid-fire inputs throttled until the current response finishes.
  - Multiple users typing simultaneously expected on shared keyboard; debounce
    prevents double submissions.
  - Screen readers announce countdown and success states to keep the experience
    inclusive.

## Edge cases and mitigation

### Connectivity

- **Backend unavailable**: Display "CONNECTION ERROR. TRY AGAIN." overlay, keep
  local commands such as help functional, and retry every ten seconds.
- **Gemini latency**: Show "Processing..." mood, fall back to canned response
  after timeout.

### Input handling

- **Empty input**: Ignore but re-focus the field; after repeated empties offer a
  lighthearted reminder.
- **Profanity**: Filter and respond with boundary messaging while still
  incrementing the hint timer.
- **Long messages**: Truncate to a safe length, acknowledge receipt, and ask for
  shorter input.

### Session integrity

- **Memory pressure**: Cap concurrent sessions (expected one) and prune stale
  records on reset.
- **Clock drift**: Use monotonic timers in the frontend so kiosk time changes do
  not affect reset cadence.

## Implementation roadmap

### Frontend tasks

- **Terminal renderer**: Ensure command queue handles overlapping requests and
  countdown overlays.
- **Idle manager**: Track last input timestamp, show warning banner, call reset
  handler.
- **Hint UI**: Surface hint tier changes subtly (for example a glowing mood
  indicator) without breaking immersion.
- **Staff controls**: Provide hidden reset shortcut and optional status footer
  toggleable with a password.

### Backend tasks

- **Session store**: Map keyed by `sessionId` with `{ turnCount, hintLevel,
  secretRevealed, lastInteraction }` payload.
- **Hint escalation**: Utility function returns the next hint string based on
  hint level and interaction signals.
- **Secret reveal**: Deterministic condition checks (keywords, haiku pattern,
  turn limit) before marking `secretRevealed`.
- **Reset endpoint**: Lightweight route clears session manually when staff
  invoke it.

### Testing checklist

- **Lint**: `npx --yes markdownlint-cli2 "**/*.md"`
- **Scenario tests**: Simulate success path, Gemini failure fallback, idle
  timeout, and manual reset.
- **Accessibility pass**: Keyboard-only walkthrough and screen reader
  announcements for key states.
- **Performance**: Verify animation smoothness on kiosk hardware and ensure no
  memory leaks over repeated resets.

## Open questions

- **Gemini budget**: Confirm API quota and latency tolerance to size offline
  fallback.
- **Audio cues**: Determine kiosk volume limits and provide a mute toggle for
  staff.
- **Secret rotation**: Decide whether the keyword rotates daily and how staff
  update the configuration.
- **Analytics**: Identify whether we need aggregate play counts without
  persistent storage.
