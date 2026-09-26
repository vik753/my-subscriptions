# Review: payment-start (feat/payment-start vs origin/dev)

## Scope (2026-09-26)

Commits 44fdeb0 (duration presets vertical list), f305a8c (domain `from` + walk), e5f0ac8 (AddPayment
first paid session, SessionSheet "Pay for this session"), f82cb21 (docs), c6986d5 (a11y presets label).
Checks run by reviewer: typecheck OK, lint OK, 450 unit tests pass. E2E / coverage not re-run.

Verified OK: walk matches decision 16 (sorted sessions, missed/cancelled don't take, forfeit/attended
take, anchors released at first consuming session >= from); remaining never < 0 (decision 1 floor
holds); cancelSession forfeit branch uses from-aware `paid`; renewalDue / RenewalReminder lastPaid /
calendar lastPaid consistent with new remaining; Drive merge is whole-hobby LWW, `from` passes
through JSON; EditPayment keeps `from`; i18n uk/en/ru + Slavic plurals present.

## Findings

- [minor] open — src/ui/DurationField.tsx:67 — `aria-label={String(m)}` hides visible "90 min"
  (WCAG 2.5.3 label-in-name). Drop aria-label; test by name '90 min'.
- [minor] open — src/ui/DurationField.tsx:60 — Escape closes the list while focus is on a preset that
  unmounts → focus lost to body. Return focus to the caret button.
- [minor] open — src/screens/sheets/AddPayment.tsx:53 — fallback to `unpaid[0]` when the chosen
  session got paid meanwhile may silently move the start earlier (and in One-session mode pay a
  different session). Fall back to first unpaid with date >= chosen, or close + toast.
- [minor] open — src/screens/sheets/AddPayment.tsx:69 — `from` is a date, not a key: choosing the
  later of two sessions on the same date (a move onto an occupied day) pays the earlier one instead.
  Accept (document) or disambiguate.
- [minor] open (unverified) — older app versions on another device ignore `from` (different statuses →
  calendar event colors flip between devices) and old EditPayment rebuilds {date,n,price}, dropping
  `from`. Transient until SW update; mention in PR.

## Unchecked

E2E, visual check of the vertical presets list / Session sheet button in all schemes, coverage run.

**Fixes (2026-09-26):** preset buttons are named by their visible text ("90 min"); Escape returns
focus to the caret (test); Add payment never falls back to a session earlier than the chosen one;
two sessions on one date — accepted and written into decision 16; older app versions ignoring
`from` — listed in the PR. Unchecked items: e2e (36 passed), ui-verifier (no discrepancies),
coverage (domain 100%) — all run by Claude.
