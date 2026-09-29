# Review: correct-payment (decision 18)

## Scope

`origin/dev...feat/correct-payment` — d0ebb86 (domain `walk`/`sessionPayment`), 84da788 (SessionSheet, EditPayment hint, AddPayment suggestion, i18n, 1.4.0).

## Verified

- `walk` equals the old pooled counter: take() succeeds iff sum of `left` in `open` > 0, and anchored payments join in the same `from` order. Statuses, `usedByMarked` and `remaining` are unchanged. FIFO only picks which index gets decremented.
- Stale index: SessionSheet recomputes on every store render; SheetHost guards `index in hobby.payments`. No new risk.
- AddPayment: n=0 → suggested 0, invalid. In Many mode an empty count uses last.n, so the suggestion is exactly last.price. Typed value persists across a One/Many switch (as before).
- typecheck, lint, 489 tests green (2026-09-29). Domain coverage not re-measured (the caller reports 100%).

## Findings

- minor, open: EditPayment.tsx:84 shows the "too many sessions" hint on every edit (also from HobbyDetail); decision 18 does not specify a hint.
- minor, open: AddPayment.tsx:50 — with no previous payment and an untouched field, it submits price 0 (as before, but inconsistent with "empty is refused").
- minor, open: no test for the EditPayment hint, and none for the no-previous-payment suggestion.
- minor, open: SessionSheet runs `walk` twice (summarize + sessionPayment). Negligible.

## Next

Re-check the open items if they get fixed. Visual check of the new button and hint (ui-verifier) is not done yet.

**Fixes (2026-09-29):** the Edit payment hint stays on every entry point (recorded in decision 18); without an earlier payment the amount starts empty and must be filled (test); a test for the hint. Accepted: `walk` runs twice in the session sheet (negligible).
