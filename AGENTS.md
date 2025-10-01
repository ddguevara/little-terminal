# Repository Guidelines

## Project structure & module organization
Work from the repository root. Shared dashboards such as `ALL_DOMAINS_STATUS.md` and reusable scaffolds like `DOMAIN_TEMPLATE.md` live here; link to them rather than duplicating content. Each workstream keeps active docs under `domains/<domain>/`, typically pairing `CHECKLIST.md` for execution tasks with `NOTES.md` for context and decisions (`domains/logistics/NOTES.md` is the reference pattern). Canonical program facts stay in `event-core/EVENT_DETAILS.md`—cite that file whenever timelines, budgets, or venues appear. Before adding new material, confirm placement with `ls domains` so files land in the right folder.

## Build, test, and development commands
This project is documentation-first, so there is no compile or runtime step. Use `npx --yes markdownlint-cli2 "**/*.md"` for a quick style audit; lint before publishing status updates. Run `rg -n "[TBD]" domains` to surface unresolved placeholders across domain docs. When you draft new guidance, render the Markdown locally to verify tables, links, and emoji formatting.

## Coding style & naming conventions
Title every file with a single leading `#` heading in sentence case. Use `##` and `###` for subsections to preserve navigation depth, and keep bullet lists consistent with `-`. Provide bold labels for key/value pairs (for example, `- **Lead**: Name`). Favor descriptive, action-oriented headings. File names remain uppercase with hyphen separators, such as `STATUS_NOTES.md`; mirror existing patterns when creating new documents. Stick to ASCII unless the source you are quoting already includes other characters.

## Testing guidelines
Treat the lint command as your minimum test gate. Cross-check any operational data—dates, contact names, budget lines—against `event-core/EVENT_DETAILS.md`. When introducing checklists, ensure each item names a responsible role and deadline so downstream reviewers can track accountability.

## Commit & pull request guidelines
Write commit messages in a single imperative sentence that explains both the change and its impact (e.g., "Add logistics driver checklist to capture vehicle requirements"). Group related documentation edits together and avoid opportunistic cleanup in unrelated domains. Pull requests should list affected domains, summarize the change, and note any follow-up asks for domain leads. Add screenshots for diagrams or visual tables, and link to the relevant Asana, Notion, or Slack thread so future contributors can follow the decision trail.

## Coordination notes
Align substantive timeline or scope shifts with the domain leads named in `ALL_DOMAINS_STATUS.md` before editing schedules. When spinning up a new workstream, copy `DOMAIN_TEMPLATE.md` into `domains/<new-domain>/` and customize the sections before inviting collaborators.
