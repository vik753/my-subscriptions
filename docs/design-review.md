# Design review — PWA handoff

**Status: APPROVED for implementation** (2026-09-25).
Reviewed: `design_handoff_my_subscriptions/` (PWA version: README, prototype, 23 screenshots, tokens, icons, ИНСТРУКЦИЯ.md).

All items of `docs/design-brief-pwa.md` are covered. The brief is now historical; the handoff README is the spec.
**This file overrides the handoff README where they differ.**

## Accepted scope additions (not in the brief)

- Home tab **"All sessions"** — shared month calendar of all hobbies (`22-home-calendar`).
- Duration combo field with presets 30 · 45 · 60 · 90 · 120.
- Motion spec (screens, sheets, inline reveals, toasts) with `prefers-reduced-motion`.

## Decisions (override README)

1. **Attended beyond paid.** README rule 3 says "else → unpaid"; the prototype (`sessions()`) keeps a session marked `attended` as status **attended** even when no paid slot is left. Follow the prototype. Remaining stays floored at 0.
2. **Derived totals.** `Hobby.paid` / `Hobby.price` are not stored — computed from `payments`. Money stored in minor units.
3. **Generation window.** Sessions are generated from `start` until `max(start + weeks, today + 12 weeks)`, where `weeks = max(12, ceil((paid + non-attended marks) / weekdays in the latest segment) + 4) + 2 × segments` (README rule 1 counts from `hobby.start` only, which stops producing future sessions over time).
4. **Per-hobby merge on Drive sync.** Add `updatedAt` (ISO) to `Hobby` and keep tombstones (`deletedHobbies: Record<id, ISO>`) so a hobby deleted on one device is not resurrected by a merge from another.
5. **Manifest colors.** Manifest `theme_color` / `background_color` are static (Nocturne dark). The current scheme is applied at runtime via `<meta name="theme-color">`.
6. **Hosting.** GitHub Pages (per CLAUDE.md), not Vercel as ИНСТРУКЦИЯ.md step 9 suggests. Repo is public (free branch protection + Pages).
7. **Home tabs.** Tabs are shown whenever at least one hobby exists (`01-home` / `12-home-light` were captured without them — `22-home-calendar` and README are correct). Hidden on the empty state.
8. **Move all following — base schedule.** The new segment is built from the segment in effect on the moved session's original date (the prototype used the latest schedule).
9. **Missing duration.** A weekday with a time but no duration defaults to 60 minutes (defensive; the form always sets one).
10. **Edit form without pass fields.** Edit hides _Sessions in pass_ and _Pass price_ (screenshot 07 shows them): payments are a history, new ones go through _Add payment_. Currency is editable only while the hobby has a single payment. (User-approved 2026-09-25.)
11. **Delete hobby asks for confirmation** in a sheet (the prototype deletes immediately). (User-approved 2026-09-25.)

12. **Local first, Google per hobby** (user decision 2026-09-26, overrides README "Sign in" screen and "On first sign-in create a calendar"): no sign-in screen — the app opens straight into local use. Each hobby has two independent options in the Create/Edit form, off by default: **Add to Google Calendar** and **Back up to Google Drive** (`hobby.google`, schema v3; hobbies from before v3 keep both on). Google sign-in is asked for the first time an option is turned on (right after saving) or from Settings; local-only users are never redirected to Google. Turning the calendar option off removes that hobby's events; turning the backup off removes it from the Drive copy. Local hobbies show "Stored only on this phone" instead of the sync status.

13. **Calendar guests and paid color, per hobby** (user decision 2026-09-26): with the calendar option on, the hobby form offers _Color of paid sessions_ (Google Calendar's 11 event colors with Google's names, default Basil; unpaid stay Graphite, attended Sage) and _Guests_ (emails → event `attendees`, so the sessions appear in their calendars). Events are written with `sendUpdates=none` (no email per session); guests can't modify or invite others. Schema v4.

## Accessibility adjustments (stage 11)

- **Light-mode secondary text.** `neutral-400` / `neutral-500` in all four light schemes measured 4.0:1 / 2.6:1 on `--color-bg` (WCAG AA needs 4.5:1). Darkened to L 0.50 / 0.535 (≥ 4.6:1); dark modes unchanged. Checked by `e2e/a11y.spec.ts` (axe, WCAG 2 A/AA, every screen, light + dark).
- **Neighbouring-month days** in calendars stay dimmed (opacity 0.3, as designed) and are excluded from the contrast check — they repeat the adjacent month.

## Visual defects to fix during implementation

| Screen                      | Defect                                                                    | Fix                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `19-sync-states` (reauth)   | Ghost "Sign in" wraps to two lines                                        | `white-space: nowrap`, button shrinks the status text instead (ellipsis)                                           |
| `20-settings-account`       | "Delete all data" wraps and sits under the home indicator                 | `nowrap`; bottom padding `max(34px, env(safe-area-inset-bottom) + 16px)`                                           |
| `01-home`, `19` (Home)      | Schedule line breaks inside "(90 min)" because the tag narrows the column | Keep each "Day HH:MM (N min)" group unbreakable (`nowrap` per group, wrap between groups)                          |
| `15-sign-in-states` (error) | A "Synced" toast appears on the sign-in error state and covers the button | Prototype artifact: no sync toasts before sign-in; toasts must never cover a pinned primary button (lift above it) |
| Hobby detail legend         | "Cancelled" wraps alone to a second line                                  | Acceptable; allow wrap with consistent 12px row gap                                                                |

## Open questions (non-blocking)

- After "move all following" / schedule edits, marks and moves on old-weekday keys from the edit date on become orphaned: ignored by `summarize`, but still counted as non-attended marks when sizing the generation window (same as the prototype). Clean up later if it matters.

- Session attended while unpaid (debt): show anything on the card? Default: no, as in the prototype.
