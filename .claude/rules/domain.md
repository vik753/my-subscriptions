---
paths:
  - 'src/domain/**'
---

# Domain engine rules

- Rules come from "Core rules" in `design_handoff_my_subscriptions/README.md`; reference implementation: `sessions()` in the prototype script (grep for `sessions(h)`). Known prototype bug: the generation window counts from `hobby.start` — ours must always extend to `today + 12 weeks`.
- Pure functions only: inputs → outputs, no mutation of arguments, no I/O, no `new Date()` without an explicit argument.
- Session key = originally generated date `YYYY-MM-DD`; it never changes when the session is moved.
- Payment assignment always covers the earliest non-cancelled sessions; `missed`/`cancelled` don't consume a slot, `forfeit` does.
- "Awaiting answer" = session end (start + duration) is in the past and it has no mark. "Next session" = first future session without a mark.
- Every rule and bug fix gets a Vitest case. Must cover: schedule segments and edits "from date", single move vs "move all following", cancel with/without carry-over, restore, multiple payments (price per session = last payment), DST change weeks, month/year boundaries, empty schedule.
- Keep coverage of `src/domain` at 100% lines/branches.
