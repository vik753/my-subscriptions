# Stage 5 — core screens: implementation plan

Prepared 2026-09-25 at the end of a session; screenshots 01, 02, 03, 07, 08, 12, 13, 15, 16, 18, 19 already reviewed. Delete this file when stage 5 ships.

## Routing

- `react-router` (installed) with `BrowserRouter basename={import.meta.env.BASE_URL}`. **Not HashRouter** — the OAuth redirect returns `#access_token=…` in the fragment.
- GitHub Pages deep links: copy `dist/index.html` → `dist/404.html` after build (tiny Vite plugin in `vite.config.ts`). Workbox `navigateFallback` already serves `index.html` offline.
- Routes: `/` Home · `/hobby/:id` Detail · `/new` Create · `/hobby/:id/edit` Edit. Settings/About = stage 10 (hide the gear button until then).
- Auth gate in `App`: `checking` → blank; `signedOut` / `error` / `denied` → Sign-in screen; `signedIn` / `offline` → routes.

## Remove the stage-1 spike

`src/screens/AuthSpike/*`, `src/services/googleSpike.ts`, `runChecks` / `forgetToken` / `checks` / `lastGrant` in `authStore` (+ their tests).

## Shared bits

- `store/clock.ts`: `useNow()` → `LocalDateTime`, refreshed every minute and on `visibilitychange`.
- `store/installStore.ts` + `services/install.ts`: capture `beforeinstallprompt`, `isStandalone`, iOS detection; dismissed flag = tiny UI pref in `localStorage`.
- App-level `<ToastRegion>` bound to `useToast`.
- Show `loadError` (newer-schema data) as a banner on Home.
- Sync status until stage 8: auth `offline` → `offline`, `signedOut/error` → `reauth`, else `ok`.

## Screens (exact specs: handoff README "Screens")

1. **Sign-in** (`15-sign-in*`): icon 72 (`public/icons/icon-192.png`), `APP_NAME` 26/500, `signSub`, 3 feature rows (`ticket`, `calendar-check`, `google-drive-logo` in 36px accent-900 tiles), bottom primary tall `signIn` + `signInNote`; states: loading (spinner), error box `signErr`, denied `signDenied` + `grant`.
2. **Home** (`01`, `12`, `16`, `18`): date line `formatDateLong(today)`, title `t.title` 30/500, add button (primary round) → `/new`; install card (dismissible); hobby cards (name 18/500, `formatSchedule` of the segment in effect today, tags stacked right `tagPending(n)` above `renewSoon` when remaining ≤ 1, big number 34/500 + `remOf`, max 24 pills 18×6, footer clock + `next` + `formatDate`, time or `none`); empty state (88px accent-900 circle, `ticket` 48, `emptyTitle`, `emptyBody`, primary `addHobby`). Tabs ("All sessions") come in stage 7 — don't render them yet.
3. **Hobby detail** (`02`, `03`, `13`, `19`): back ghost "‹ `title`", edit icon; title 28/500, schedule 14px, `SyncStatus`; primary block `addPayment`; 3 stat tiles (`statLeft` in paid-text, `statAttended`, `statPer` = `formatMoney(pricePerSession)` or "—"); `MonthCalendar` + `SessionDayCell` (month starts at next session's month); legend Paid · Unpaid · Attended · Unmarked · Cancelled; accent-900 row `pendingRow(n)` when pending; Upcoming (12 unmarked non-pending: `formatDate`, "HH:MM · N min [· movedShort]", `StatusPill` paid/unpaid, chevron); History (marked, newest first: `attended` / `histMissed` / `histCancelled` / `histForfeit`); Payments (date, `payN(n)`, money).
   Sheets (payment, session, prompt, pending list) are **stage 6** — leave those buttons/cells without handlers.
4. **Create / Edit** (`07`, `08`): Cancel ghost + centered title; `Field`s; `DayChips` + animated rows (full weekday name · time input 104px · `DurationField`); "Same time for all days" (`applyAll`) when rows differ; create: `fStart` auto-filled by `firstSessionDate` whenever days/times change; edit: `effFrom` default tomorrow → `editSchedule`; sessions + price (major units → ×100) + currency `SelectInput` 88px (`currencyLabel`); Google info row `calInfo(email)`; summary box (`summary` / `editSummary`, accent-900 bg, accent-200 text); primary `createBtn` / `save`; edit: ghost `del` (trash). Validation → toast `pickDay` / `fillAll`. Placeholders from `fNamePh`, "8", "8000", "60".

## Decided (design-review 10–11): Edit hides pass fields; delete asks for confirmation

Screenshot 07 shows **Sessions in pass** and **Pass price** in the Edit form, but payments are a history (`payments[]`) — editing a total there conflicts with design-review decision 2. Proposal: in Edit, hide sessions/price (changes go through "Add payment"); currency editable only while there is one payment. Also: "Delete hobby" deletes immediately in the prototype — propose a confirm sheet.

## Verification

`ui-verifier` per screen against the screenshots above (390×844 + 1280×800, dark/light, 2 schemes, uk/ru); e2e: sign-in gate with a stubbed auth state, create hobby → appears on Home → detail shows 8 paid sessions; `reviewer` before `/ship`.
