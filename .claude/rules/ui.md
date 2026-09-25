---
paths:
  - 'src/ui/**'
  - 'src/screens/**'
  - 'src/theme/**'
---

# UI rules

- High-fidelity design: match sizes, weights, spacing and copy from the handoff README and the relevant screenshot in `design_handoff_my_subscriptions/screenshots/`.
- Tokens come from `design_handoff_my_subscriptions/tokens/theme-tokens.css`; `oklch()` is used as-is. Scheme/mode are `data-scheme` / `data-mode` attributes on `<html>`.
- Buttons: primary = 1px accent outline + accent text, **never filled**; secondary = divider border; ghost = accent text. Pressed/hover tint 12% / 22%, focus = 2px accent outline offset 2.
- Headings weight ≤ 500. Font Inter. Icons: `@phosphor-icons/react`, regular weight.
- Mobile-first 390px; touch targets ≥ 44px; respect `env(safe-area-inset-*)`. Wider than 480px → centered 480px column, sheets same width.
- Use native inputs (`type="date"`, `type="time"`, `type="number"` with `inputMode`) — they open the system pickers on phones.
- Accessibility: every icon-only button has `aria-label` (from i18n); sheets trap focus and close on Escape; don't convey status by color alone (pills have text).
- Components in `ui/` are presentational: props in, callbacks out, no store access.
- Verify every UI change in light + dark and at least two color schemes.
