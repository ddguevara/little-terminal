# Repository Guidelines

## Project structure & module organization

- Work from the repository root; the kiosk UI ships via `index.html`, with
  behavior in `script.js` and animations in `visuals.js`.
- Keep server concerns in `server.js` and route LLM calls to the FastAPI
  bridge under `python_service/` rather than bolting logic into Express.
- Extend the shared styling in `style.css` before adding selectors, and document
  any new utility classes inline.
- Ignore generated folders such as `node_modules/`; reference their APIs but do
  not commit them.

## Build, test, and development commands

- `npm install` primes local dependencies; rerun whenever `package.json`
  changes.
- `python -m pip install -r python_service/requirements.txt` prepares the LLM
  bridge environment inside your active virtualenv.
- `npm start` serves the app on `http://localhost:3000` using the production
  Express entrypoint.
- `uvicorn python_service.main:app --reload --factory` starts the Gemini bridge
  on `http://localhost:8000`; export `GEMINI_API_KEY` when wiring the real
  model.
- `npx nodemon server.js` hot-reloads backend updates; watch the terminal for
  session IDs or stack traces.
- `npx --yes markdownlint-cli2 "**/*.md"` enforces documentation style before
  submitting work.

## Coding style & naming conventions

- Use 2-space indentation for JavaScript and keep functions focused on a single
  responsibility.
- Favor ES module imports in the browser (`import { initVisuals } from
  './visuals.js';`) and CommonJS requires on the server for consistency.
- Name constants in SCREAMING_SNAKE_CASE, exported helpers in lowerCamelCase,
  and keep filenames lowercase with hyphens only when necessary.
- Add concise comments when logic is non-obvious, and use bold labels in docs
  for key metadata (for example, `- **Lead**: Name`).

## Testing guidelines

- Automated tests are not yet defined; run `npm start`, exercise the chat flow,
  and confirm the secret unlock sequence still works.
- Probe failure paths by sending off-topic prompts and clearing
  `localStorage.sessionId` between attempts.
- Capture console warnings or unhandled rejections in the PR description so
  reviewers can replay your checks.

## Commit & pull request guidelines

- Write imperative, one-line commit messages that note both the change and the
  effect (for example, `Streamline kiosk hints for poem prompts`).
- Group related UI, server, and documentation edits together; defer large
  refactors to dedicated branches.
- PRs should call out touched files, include screenshots or gifs for UI impact,
  and link to the ticket or discussion that drove the change.
- List any follow-up tasks as checklist items to help the next agent pick them
  up quickly.
