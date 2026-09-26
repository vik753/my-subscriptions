# Review notes — stage 5 (core screens)

**Scope reviewed (2026-09-25):** PR #16, `origin/main...origin/dev` (7 commits): App auth gate + router, 404 fallback, SignIn, Home (HobbyCard, InstallCard), HobbyForm, HobbyDetail, clock / install / syncState stores, spike removal, e2e core flow.
**Verdict:** CHANGES REQUESTED. Fixes go into a follow-up PR (agreed with the user).
**Checked and fine:** BrowserRouter + basename and `#access_token` cleanup, first-session auto-fill, delete confirm (i18n in uk/en/ru), Detail numbers from `summarize`, no console.log / new deps, spike fully removed.
**Visual pass:** done 2026-09-26 (see below).

## Findings

| #   | Sev                 | Where                          | Problem → fix                                                                                                                                                                                                       | Status |
| --- | ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | blocker             | HobbyForm.tsx:118,137          | Edit "Changes apply from" not validated; `''` or a past date rewrites history via `withSegment` → require `effective >= today` in `valid`, toast `fillAll`, test                                                    | fixed  |
| 2   | major               | HobbyForm.tsx:116,118          | Price "1.2.3" / "," → NaN stored → accept `^\d+([.,]\d{1,2})?$`, integer parsing, part of `valid`, tests ("8000,50" → 800050, invalid)                                                                              | fixed  |
| 3   | major               | Home.tsx:35-40, appStore.ts:71 | `loadError` shows raw English dev message → i18n key (uk/en/ru); drop stale TODO                                                                                                                                    | fixed  |
| 4   | major, **decision** | App.tsx:55, syncState.ts:11    | Expired session (silent renewal failed) unmounts routes → returning user locked out of local data; `reauth` state unreachable → gate only never-signed-in users, keep routes + `reauth` status for expired sessions | fixed  |
| 5   | minor               | SignIn.tsx:12                  | Loading spinner never shows → local `redirecting` state on click                                                                                                                                                    | fixed  |
| 6   | minor               | HobbyForm.tsx:259              | Edit currency select labelled "Pass price" → own label key                                                                                                                                                          | fixed  |
| 7   | minor               | HobbyForm.tsx:67,137           | Edit loads today's segment; saving drops later segments; no-op save appends segment → load latest segment, skip `editSchedule` when unchanged                                                                       | fixed  |
| 8   | minor               | HobbyForm.tsx:45               | Cancel `navigate(-1)` leaves the app on a cold deep link; Save leaves Detail twice in history → fallback routes                                                                                                     | fixed  |
| 9   | minor               | HobbyForm.test.tsx             | Missing tests: currency rule, effective-date guard, decimal / invalid price, applyAll                                                                                                                               | fixed  |
| 10  | minor               | vite.config.ts:14              | 404 copy hardcodes `dist/` → use resolved outDir                                                                                                                                                                    | fixed  |
| 11  | minor, unverified   | authStore.ts:76                | Silent renewal lands on Home, losing the current route → save path before redirect                                                                                                                                  | fixed  |

**Decision #4 (user, 2026-09-26):** the sign-in screen is only for users who have never signed in on this device (no stored account hint). A returning user whose session expired keeps their data and sees "Sign in again" (`reauth`) in the sync status. Signing out forgets the account, so the sign-in screen comes back.

**Fixes (2026-09-26):** #1–#11 fixed with unit tests; e2e covers the expired-session case. Not in scope: the small offline/reauth icon in the Home header (README Home spec) — lands with sync in stage 8.

**ui-verifier (2026-09-26):** Sign-in / Home / Detail / Form match in nocturne + sea × light/dark, 390px and desktop. Fixed from its report: schedule line wrapped inside a group (design-review #3) and screens kept the previous scroll offset. Not checked live: sign-in error/denied states, uk/ru overflow.

## Next steps

Reviewer on the follow-up PR (together with the next stages).
