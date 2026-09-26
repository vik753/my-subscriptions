# Review notes: calendar guests + paid color (schema v4)

**Scope reviewed (2026-09-26):** `dev...feat/calendar-guests-color` (1ddaab2): types/mutations, migrate v4, syncStore eventBody + hash, calendarApi sendUpdates, ColorPicker, GuestList, HobbyForm, tokens `--gcal-*`, i18n uk/en/ru, tests, e2e.
**Checks (run by reviewer):** typecheck, lint, 397 unit tests green. e2e not re-run.
**Verdict:** APPROVE with minors (no blockers).

## Findings

| #   | Sev                | Where                            | Problem → fix                                                                                                                                                                                                                                                           | Status     |
| --- | ------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | major              | GuestList.module.css:49-52       | Remove-guest button is 32×32, below the 44px target rule. Enlarge the hit area (44px box or ::before overlay), keep the visual size                                                                                                                                     | fixed      |
| 2   | minor              | HobbyForm.tsx:160, GuestList.tsx | Email typed but not "Add"-ed is silently dropped on Save. Commit a valid draft on submit (or show the error)                                                                                                                                                            | fixed      |
| 3   | minor              | calendarApi.ts:85 (patch)        | Patch sends the full `attendees` array without `responseStatus` → any rewrite (status change, color) resets the guest's RSVP to needsAction. Acceptable; document or accept                                                                                             | accepted   |
| 4   | minor (unverified) | sync / docs                      | With sendUpdates=none, events appear only if the guest's Calendar setting "Add invitations to my calendar" allows it (not with "when I respond"/possibly "only known senders"); non-Google addresses see nothing. Verify with the real account; mention in family guide | documented |
| 5   | minor              | ColorPicker.tsx:43-58            | role=radiogroup without arrow-key/roving tabindex (ARIA radio pattern). Either add arrow keys or drop radio roles for a listbox/plain buttons with aria-pressed                                                                                                         | fixed      |
| 6   | minor              | migrate.ts:51-53                 | Guests from storage/backup not trimmed/lowercased/deduped/validated; duplicate attendees could make Google reject the event. Normalize + dedupe                                                                                                                         | fixed      |
| 7   | minor              | GuestList.module.css:111         | Error text uses --color-accent (no error token exists) — check against design/other form errors                                                                                                                                                                         | accepted   |
| 8   | minor              | docs/design-review.md            | User-approved feature (guests, paid color, schema v4) not recorded in design-review.md / README / family guide                                                                                                                                                          | fixed      |

## Notes

- Hash includes attendees/colorId → guest/color edits rewrite events (tested). First sync after upgrade rewrites every event once (body gained fields) — acceptable.
- Merge: per-hobby LWW on updatedAt carries the new fields; updateHobby stamps updatedAt.
- Scope calendar.app.created allows attendees on events in the app-created calendar; organizer stays the secondary calendar; delete with sendUpdates=none still removes guest copies.

## Unchecked

e2e run, screenshots of the new blocks in light/dark × 4 schemes, real Google behaviour of #4.

## Next steps

Fix #1, #2; decide #3/#4/#5/#6; record decision in design-review.md.

**Fixes (2026-09-26):** #1 44px tap area via `::before` (32px visual). #2 a typed guest counts on Save; a malformed one blocks the save with a toast (test). #5 colors are plain buttons with `aria-pressed`. #6 guests trimmed, lowercased, deduplicated and validated when read (test). #8 decision 13 in design-review, README, family guide. Accepted: #3 RSVP reset on rewrite (guests are informational), #7 error text in accent like other inline alerts. #4 documented: guests need a Google account and "Add invitations to my calendar: From everyone"; to be checked on the real account.
