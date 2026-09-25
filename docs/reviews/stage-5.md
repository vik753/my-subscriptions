# Review notes — stage 5 (core screens)

**Scope reviewed (2026-09-25):** PR #16, `origin/main...origin/dev` (7 commits): App auth gate + router, 404 fallback, SignIn, Home (HobbyCard, InstallCard), HobbyForm, HobbyDetail, clock / install / syncState stores, spike removal, e2e core flow.
**Verdict:** CHANGES REQUESTED. Fixes go into a follow-up PR (agreed with the user).
**Checked and fine:** BrowserRouter + basename and `#access_token` cleanup, first-session auto-fill, delete confirm (i18n in uk/en/ru), Detail numbers from `summarize`, no console.log / new deps, spike fully removed.
**Not yet done:** `ui-verifier` visual pass of the four screens; e2e not rerun by the reviewer.

## Findings

| #   | Sev                 | Where                          | Problem → fix                                                                                                                                                                                                       | Status          |
| --- | ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | blocker             | HobbyForm.tsx:118,137          | Edit "Changes apply from" not validated; `''` or a past date rewrites history via `withSegment` → require `effective >= today` in `valid`, toast `fillAll`, test                                                    | open            |
| 2   | major               | HobbyForm.tsx:116,118          | Price "1.2.3" / "," → NaN stored → accept `^\d+([.,]\d{1,2})?$`, integer parsing, part of `valid`, tests ("8000,50" → 800050, invalid)                                                                              | open            |
| 3   | major               | Home.tsx:35-40, appStore.ts:71 | `loadError` shows raw English dev message → i18n key (uk/en/ru); drop stale TODO                                                                                                                                    | open            |
| 4   | major, **decision** | App.tsx:55, syncState.ts:11    | Expired session (silent renewal failed) unmounts routes → returning user locked out of local data; `reauth` state unreachable → gate only never-signed-in users, keep routes + `reauth` status for expired sessions | open — ask user |
| 5   | minor               | SignIn.tsx:12                  | Loading spinner never shows → local `redirecting` state on click                                                                                                                                                    | open            |
| 6   | minor               | HobbyForm.tsx:259              | Edit currency select labelled "Pass price" → own label key                                                                                                                                                          | open            |
| 7   | minor               | HobbyForm.tsx:67,137           | Edit loads today's segment; saving drops later segments; no-op save appends segment → load latest segment, skip `editSchedule` when unchanged                                                                       | open            |
| 8   | minor               | HobbyForm.tsx:45               | Cancel `navigate(-1)` leaves the app on a cold deep link; Save leaves Detail twice in history → fallback routes                                                                                                     | open            |
| 9   | minor               | HobbyForm.test.tsx             | Missing tests: currency rule, effective-date guard, decimal / invalid price, applyAll                                                                                                                               | open            |
| 10  | minor               | vite.config.ts:14              | 404 copy hardcodes `dist/` → use resolved outDir                                                                                                                                                                    | open            |
| 11  | minor, unverified   | authStore.ts:76                | Silent renewal lands on Home, losing the current route → save path before redirect                                                                                                                                  | open            |

## Next steps

Get the user's decision on #4 → fix #1–#11 in one follow-up PR → run `ui-verifier` on Sign-in / Home / Detail / Form → update this file.
