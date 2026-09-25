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
3. **Generation window.** Always generate until at least `today + 12 weeks` (README rule 1 counts from `hobby.start`, which stops producing future sessions over time).
4. **Per-hobby merge on Drive sync.** Add `updatedAt` (ISO) to `Hobby` and keep tombstones (`deletedHobbies: Record<id, ISO>`) so a hobby deleted on one device is not resurrected by a merge from another.
5. **Manifest colors.** Manifest `theme_color` / `background_color` are static (Nocturne dark). The current scheme is applied at runtime via `<meta name="theme-color">`.
6. **Hosting.** GitHub Pages (per CLAUDE.md), not Vercel as ИНСТРУКЦИЯ.md step 9 suggests. Pending final repo visibility decision.
7. **Home tabs.** Tabs are shown whenever at least one hobby exists (`01-home` / `12-home-light` were captured without them — `22-home-calendar` and README are correct). Hidden on the empty state.

## Visual defects to fix during implementation

| Screen                      | Defect                                                                    | Fix                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `19-sync-states` (reauth)   | Ghost "Sign in" wraps to two lines                                        | `white-space: nowrap`, button shrinks the status text instead (ellipsis)                                           |
| `20-settings-account`       | "Delete all data" wraps and sits under the home indicator                 | `nowrap`; bottom padding `max(34px, env(safe-area-inset-bottom) + 16px)`                                           |
| `01-home`, `19` (Home)      | Schedule line breaks inside "(90 min)" because the tag narrows the column | Keep each "Day HH:MM (N min)" group unbreakable (`nowrap` per group, wrap between groups)                          |
| `15-sign-in-states` (error) | A "Synced" toast appears on the sign-in error state and covers the button | Prototype artifact: no sync toasts before sign-in; toasts must never cover a pinned primary button (lift above it) |
| Hobby detail legend         | "Cancelled" wraps alone to a second line                                  | Acceptable; allow wrap with consistent 12px row gap                                                                |

## Open questions (non-blocking)

- Session attended while unpaid (debt): show anything on the card? Default: no, as in the prototype.
- Repo visibility (public → free branch protection + Pages).
