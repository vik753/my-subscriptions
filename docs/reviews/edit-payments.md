# Review: edit-payments (feat/edit-payments vs dev)

## Scope (2026-09-26)

Commits bedb789 (domain editPayment/removePayment + tests), 241eb89 (EditPayment sheet, PaymentList,
SessionSheet carry question, i18n, README, design-review decision 10 update).
Checks run: typecheck OK, lint OK, 426 unit tests pass. E2E / coverage not re-run by reviewer.

## Findings

- [major] open — src/screens/sheets/EditPayment.tsx:32,38 — save/remove address the payment by index
  inside the updater against the _current_ hobby; a Drive merge (applyMerged, whole-hobby LWW) while
  the sheet is open can reorder/shorten payments, so the wrong payment is overwritten/deleted. Fix:
  capture the original payment at mount and, in the updater, apply only if `h.payments[index]` still
  equals it; otherwise leave h unchanged, close and toast.
- [major] open — src/screens/sheets/EditPayment.tsx:29-31 — `parsePrice('')` returns 0, so clearing the
  amount silently saves price 0. Test "refuses an empty or malformed amount" (sheets.test.tsx:169)
  only clears Sessions. Fix: treat `price.trim() === ''` as invalid; add amount-empty + malformed tests.
- [minor] open — EditPayment.tsx:22 + SheetHost.tsx:55,63 — if the payment disappears while open,
  EditPayment returns null but SheetHost's orphan check sees a non-null element → empty open sheet.
  Fix: resolve `hobby.payments[shown.index]` in SheetHost and return null there.
- [minor] open — EditPayment.tsx:39 — delete is immediate, no confirm/undo (hobby delete confirms,
  decision 11). Ask user whether a confirm step is wanted.
- [minor] open — PaymentList.tsx:8 — "newest first" is array order reversed; after a date edit the
  list is no longer date-ordered, and pricePerSession/"repeat last payment" use array-last. Acceptable
  if intended; document or keep as is.

## Unchecked

UI visual check vs design (no screenshot for Edit payment exists), dark/scheme rendering, e2e.

## Next

Re-review after fixes to the two majors.

**Fixes (2026-09-26):** the sheet captures the payment when it opens and only saves/deletes if it is still at that index (else a toast; test). An empty amount is invalid (tests for empty and `1.234`). SheetHost closes the sheet when the payment is gone. Delete asks for confirmation (like deleting a hobby — decided by Claude, in the PR checklist). The list shows payments in the order they were added (most recent entry first), documented in the component.
