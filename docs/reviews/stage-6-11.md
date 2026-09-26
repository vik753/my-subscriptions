# Review notes — stages 6–11 (+ stage 5 fix verification)

**Scope reviewed (2026-09-26):** `origin/main...dev` at 00c283e (29 commits, 96 files): sheets/flowStore/renewal, AllSessions, calendar sync (calendar.ts, googleHttp, calendarApi, syncStore), Drive backup (merge.ts, driveApi, backup.ts, schema v2), Settings/About, UpdateBanner, tokens a11y change.
**Checks:** typecheck, lint, 365 unit tests green (run by reviewer). e2e not re-run.
**Verdict:** CHANGES REQUESTED.
**Stage 5 findings #1–#11:** spot-checked (effective-date guard, parsePrice, loadErr i18n, auth returnTo, 404 outDir) — fixed.

## Findings

| #   | Sev             | Where                           | Problem → fix                                                                                                                                                                                                     | Status |
| --- | --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | major           | syncStore.ts:123-131,199        | Stale driveFileId → 404 → fileId=null, no re-search → second state.json per device (split-brain); online wipe on device B undone by device A → on 404 (and before create) call findStateFile again; 2-device test | fixed  |
| 2   | major, decision | authStore.ts:219, syncStore:118 | Sign-out keeps local hobbies; next account on the device gets them merged into its Drive + Calendar → ask user: clear local data on sign-out / account change                                                     | fixed* |
| 3   | minor           | syncStore.ts:115,228            | Locally expired token → synthetic 401 → expire() → reauth without silent refresh (README:106); races with resume() → trigger resume/init instead of expire when token merely expired                              | fixed  |
| 4   | minor           | syncStore.ts:227-234            | Newer-schema backup / other errors swallowed: status "ok", sync stalls silently; 404 → schedule() has no backoff (possible 1.5s loop, unverified) → surface an error state; cap 404 retries                       | fixed  |
| 5   | minor           | syncStore.ts:214                | Sync runs while useApp.loadError (local = defaultState): with no Drive file it deletes all synced events and uploads an empty backup → skip run when loadError                                                    | fixed  |
| 6   | minor           | Settings.tsx:60-65              | "today" from new Date() instead of localClock                                                                                                                                                                     | fixed  |

## Unchecked

MovePicker/PendingList/AttendancePrompt/RenewalReminder internals, AllSessions dot rules vs README:134 in detail, CSS token usage per module, 44px targets, uk/ru key parity beyond typecheck (messages typed against one shape — assumed enforced), icons.

**Fixes (2026-09-26):** all six fixed with tests in `syncStore.test.ts` (two-device wipe via stale file id, token expired locally → resume, loadError → no sync, newer backup → toast once, 404 retried once). \*#2 decided by Claude while the user was away (listed in the PR checklist): sign-out keeps local data; when a _different_ account signs in, the previous account's hobbies are dropped locally (theme/language kept) before syncing, so nothing leaks into the new account.

## Next steps

User reviews the PR decisions checklist; re-review of the syncStore diff optional.
