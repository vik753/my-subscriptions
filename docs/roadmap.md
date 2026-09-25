# Roadmap

Approved by the user on 2026-09-25. Update the checkboxes and "Status" as stages complete.
Every stage ends with `/ship` → PR `dev → main` → the user merges → GitHub Pages deploys.

**Status:** Stages 0, 2 done. Stage 1 code shipped — waiting for the user's iPhone test (go / no-go). Next: Stage 3.

| #   | Stage                  | Deliverable                                                                                                                                     | Agents                                 | Est.  |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----- |
| 0   | ✅ Scaffold            | Project, CI, `main` protection, Pages deploy, agents                                                                                            | —                                      | done  |
| 1   | ☐ Google sign-in spike | GIS sign-in in the installed iOS PWA + silent token refresh on open. **Go / no-go** for the serverless architecture                             | —                                      | 1–2 d |
| 2   | ✅ Domain engine       | Model, session generation, payments, statuses, moves, cancel/forfeit/restore, schedule edits, pending, next session — 100% coverage             | `spec-tester` → implement              | 4–5 d |
| 3   | ☐ Data, i18n, theme    | IndexedDB + Zustand, schema versioning/migrations, all prototype strings in uk/en/ru with plurals, date/money formatting, scheme/mode switching | `spec-tester` (formatting, migrations) | 2–3 d |
| 4   | ☐ UI kit               | Button, Card, Sheet (motion), Switch, Segmented, Tag, Pill, Toast, MonthCalendar, inputs, Spinner, SyncStatus                                   | `ui-verifier`                          | 3–4 d |
| 5   | ☐ Core screens         | Sign-in (all states), Home (list, empty, install card), Hobby detail, Create/Edit                                                               | `ui-verifier`                          | 4–5 d |
| 6   | ☐ Sheets & flows       | Add payment, Session sheet (move/cancel/restore), Attendance prompt, Pending list, Renewal reminder + snooze, app-open check                    | `ui-verifier`                          | 3–4 d |
| 7   | ☐ "All sessions" tab   | Shared month calendar of all hobbies                                                                                                            | `ui-verifier`                          | 1–2 d |
| 8   | ☐ Google Calendar sync | App calendar, events (colors, descriptions, reminders), diff → patch only changed, offline outbox, 12-week rolling window, mapping recovery     | `spec-tester` (event derivation)       | 4–5 d |
| 9   | ☐ Google Drive backup  | `state.json` in appDataFolder, per-hobby merge with `updatedAt` + tombstones, offline, reauth state                                             | `spec-tester` (merge)                  | 3 d   |
| 10  | ☐ Settings & About     | Account, Calendar reminder, install row, delete all data, share                                                                                 | `ui-verifier`                          | 2 d   |
| 11  | ☐ Family release       | Vector icon + all sizes, desktop layout pass, a11y pass, update-available banner, OAuth app publishing, install guide for family                | `ui-verifier`, `reviewer`              | 2–3 d |

## Milestones

- **M1 — try it myself** (after 6): works on the phone by link, local only (no Google).
- **M2 — with calendar** (after 9): full Google Calendar + Drive cycle, offline.
- **M3 — family** (after 11): polished, install guide, link shared.

## User actions

- Before stage 1: Google Cloud project, enable Calendar + Drive APIs, OAuth consent screen (External, test users), Web OAuth Client ID with origins `http://localhost:5173` and `https://vik753.github.io`; send the Client ID; add repo variable `VITE_GOOGLE_CLIENT_ID`.
- Stage 1: install the PWA on an iPhone and test sign-in.
- After each stage: merge the PR; from M1 test on the phone and report issues with screenshots.
