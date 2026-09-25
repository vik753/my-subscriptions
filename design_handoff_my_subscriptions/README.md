# Handoff: My Subscriptions — PWA (Google only)

## Overview
**My Subscriptions** tracks prepaid class passes (gym, language lessons, any hobby). The user signs in with Google, creates a hobby with a weekly schedule (days, time and duration per day), records how many sessions were paid and for how much. The app creates its own **"My Subscriptions" calendar** in the user's Google Calendar and fills it with all future sessions: the first N (paid) are green and titled **Paid**, the rest **Unpaid**.

There are **no push notifications**. When the app is opened (or brought back to the foreground) it finds past sessions without a mark and asks "Did you attend?" — one session → a single prompt, two or more → a list. Attended → the session is consumed. Didn't happen → the payment carries over to the next unpaid session. When a hobby has ≤ 1 paid session left, the app shows a renewal reminder and writes a note into the last paid Google Calendar event.

**Target platforms:** PWA — iOS Safari 16.4+, Android Chrome, desktop browsers. Installable to the Home Screen. Languages: Ukrainian, English, Russian.

**No server.** The app talks directly to Google Calendar API and Google Drive API (appDataFolder) from the browser using Google Identity Services (OAuth token flow).

## About the Design Files
The files in `design/` are **design references built in HTML** — an interactive prototype of the intended look and behavior, not production code. Recreate them in a real web stack. Recommended: **Vite + React + TypeScript**, `vite-plugin-pwa` (manifest + service worker), IndexedDB (`idb` or Dexie) for local storage, Google Identity Services + `gapi` REST calls. Any modern framework (SvelteKit, Vue) is fine.

Open `design/Абонементы.dc.html` in a browser (`npx serve design`) to click through. The side panel has demo buttons (re-open app, sign-in states, empty list, phone/desktop, sync states). Prototype Tweaks: `signedIn`, `installed`, `syncState` (ok/syncing/offline/reauth), `pendingCount` (0/1/3), `device` (phone/desktop), language, scheme, mode, weeks ahead. Demo "now" is **Thu, Sep 24 2026, 10:02**. All logic lives in the `<script data-dc-script>` block at the bottom of the file — read it for exact rules and all strings (object `L`).

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and interactions are final for v1. Use native inputs (date/time pickers, `<select>`) and the Web Share API where the prototype does.

---

## Data model

```ts
type Weekday = 0|1|2|3|4|5|6;          // 0 = Monday … 6 = Sunday
type Currency = 'UAH'|'USD'|'EUR';

interface ScheduleSegment {             // schedule versioning — edits apply from a date
  from: string;                         // 'YYYY-MM-DD', inclusive
  times: Partial<Record<Weekday,string>>; // 'HH:MM' per active weekday
  durs:  Partial<Record<Weekday,number>>; // minutes per weekday
}

interface Payment { date: string; n: number; price: number; }

type Mark = 'attended'      // went; consumes a paid slot
          | 'missed'        // "didn't happen"; payment carries over
          | 'cancelled'     // cancelled in advance; payment carries over
          | 'forfeit';      // cancelled, payment NOT carried over; consumes a paid slot

interface Hobby {
  id: string;
  name: string;
  start: string;                        // first session date
  sched: ScheduleSegment[];             // sorted by `from`
  paid: number;                         // = sum(payments.n)
  price: number;                        // = sum(payments.price)
  payments: Payment[];
  currency: Currency;
  marks: Record<string /*session key*/, Mark>;
  moves: Record<string /*session key*/, { date: string; time: string }>;
}

interface Settings {
  language: 'uk'|'en'|'ru';
  scheme: 'nocturne'|'sea'|'clay'|'graphite';
  mode: 'light'|'dark';
  reminderMinutes: 0 | 15 | 30 | 60;    // Google Calendar popup reminder; 0 = off (default)
  renewSnoozedUntil: Record<string /*hobbyId*/, string /*'YYYY-MM-DD'*/>;
}

interface SyncMeta {                    // local only
  calendarId: string;                   // id of the "My Subscriptions" calendar
  events: Record<string /*hobbyId|sessionKey*/, string /*eventId*/>;
  queue: Array<{ op: 'upsert'|'delete'; key: string }>; // pending changes while offline
  lastSync: string;                     // ISO
}
```

A **session key** is the originally generated date `YYYY-MM-DD`. It stays stable when the session is moved.

## Core rules

1. **Session generation.** Walk dates from `hobby.start`. For each date, take the last `ScheduleSegment` with `from <= date`; if it has a time for that weekday, emit `{key, date, time, dur}`. Generate at least `ceil((paid + nonAttendedMarks) / daysPerWeek) + 4` weeks (min 12).
2. **Apply moves.** Replace date/time from `moves[key]`; re-sort chronologically.
3. **Assign payment.** Walk in order with `used = 0`:
   - `missed` / `cancelled` → status **missed** (no slot).
   - `forfeit` → uses a slot if `used < paid`; status **forfeit**.
   - otherwise if `used < paid` → uses a slot; **attended** (if marked) or **paid**.
   - else → **unpaid**.
4. **Remaining** = `paid − attended − forfeit`, floor 0.
5. **Price per session** = `lastPayment.price / lastPayment.n`.
6. **Awaiting answer (pending)** = session with no mark whose end time (`start + duration`) is in the past.
7. **Next session** = first **future** session without a mark (pending ones are excluded).
8. Pending sessions still occupy their paid slot until answered.

## App open check (replaces notifications)
Run on launch and on `visibilitychange → visible`, after sign-in:
1. Collect pending sessions across all hobbies, sorted **oldest first** (order affects payment assignment).
2. 1 pending → **Attendance prompt** sheet. ≥ 2 → **Mark past sessions** sheet.
3. If none (or after saving): for every hobby with `remaining <= 1` and `renewSnoozedUntil[id] <= today` → **Renewal reminder**, one after another.
4. "Later" on the prompt/list hides it until the next open. "Remind me later" on the renewal sheet sets `renewSnoozedUntil[id] = tomorrow`.

## Google Calendar
- On first sign-in create a secondary calendar **"My Subscriptions"** (`calendars.insert`); store its id. Scope: `https://www.googleapis.com/auth/calendar.app.created` (only calendars the app created) + `https://www.googleapis.com/auth/drive.appdata`.
- One event per session. Keep `hobbyId|sessionKey → eventId` and store the key in `extendedProperties.private` for recovery.
- **Title:** `<Hobby> · Paid` / `<Hobby> · Unpaid` (localized: «Спортзал · Оплачено» / «Спортзал · Не оплачено»).
- **Color (`colorId`):** paid → **Basil (10)**, unpaid → **Graphite (8)**, attended → **Sage (2)**. Cancelled/missed → **delete** the event. Forfeit → Sage.
- **Description:** status line, `evDur` ("Duration: 60 min"), for the last paid session the line `lastPaidNote` ("Last paid session — time to renew your pass"), then the app URL.
- **Reminders:** `reminders.useDefault = false`, `overrides = [{method:'popup', minutes: reminderMinutes}]` or none when 0. This is the only notification in the product (sent by Google Calendar).
- On any change (mark, move, cancel, payment, schedule edit, delete hobby) recompute statuses and **patch/insert/delete only changed events**. Keep ≥ 12 weeks of future events (extend on open).

## Storage & sync
- Write every change to **IndexedDB first**, then push. State file `state.json` (hobbies + settings) lives in Google Drive **appDataFolder**; last-write-wins with `modifiedTime` check, merge on conflict per hobby.
- Offline: queue calendar/Drive operations, retry on `online` event and on open.
- Token expired and silent refresh failed → state **reauth**.
- **Sync status component** states: `ok` (`calendar-check`, "Synced with Google Calendar"), `syncing` (spinner, "Syncing…"), `offline` (`cloud-slash`, "Offline — changes will sync later"), `reauth` (`warning` in accent, "Sign in again to sync" + ghost "Sign in"). Toasts: "Synced", "Offline. Changes are saved on this device".
- "Delete all data": delete the calendar, the Drive file and IndexedDB; return to empty Home.

## PWA
- Web App Manifest: name "My Subscriptions", `display: standalone`, theme/background color = `--color-bg` of the current scheme, icons 192/512 + maskable (from `icons/`).
- Service worker: precache app shell, network-first for Google APIs.
- **Install hint** when not `display-mode: standalone`: iOS → text "Tap Share (share-network icon) → Add to Home Screen"; Android/desktop → button "Install" that calls the saved `beforeinstallprompt` event.
- **Desktop:** wider than 480px → content column `max-width: 480px`, centered on `--color-bg`; bottom sheets and toasts same width, centered.

---

## Screens / Views

Phone frame in the prototype: 390×844. Screen padding **20px**, block gap **16–18px**. Bottom sheets: radius **28px top**, padding `10px 20px 34px`, grab handle 36×5, max-height = viewport − 24px, scroll inside.

### 0. Sign in (first run / after sign-out)
- App icon 72px, "My Subscriptions" 26px/500, subtitle 14px neutral-400.
- 3 feature rows (36px accent-900 tile + icon, 14px text): `ticket` passes & remaining · `calendar-check` sessions in Google Calendar, paid are green · `google-drive-logo` data in your Google Drive.
- Bottom: primary full-width 48px "Sign in with Google" (`google-logo`); 12px neutral-500 note about scopes (`signInNote`).
- States: **loading** (button disabled + spinner), **error** (surface box with `warning`: "Couldn't sign in. Please try again"), **denied** ("Without calendar access the app can't create sessions" + button "Grant access").
- Screenshots: `15-sign-in`, `15-sign-in-states`.

### 1. Home — "Subscriptions"
- Header: date line 13px neutral-400 (+ small sync icon only when offline/reauth), title 30px/500. Right: settings (ghost, 44 round) and add (primary outline, 44 round).
- **Install card** (not installed, dismissible ×): surface, radius 14; `download-simple` tile, "Add to Home Screen", instruction per platform (`16-install-hint`).
- **Hobby card** (surface, radius 14, padding 18, gap 14): name 18/500, schedule 13px; tags on the right, stacked: **"Unmarked: N"** (tag-accent, `clock-countdown`, opens the pending flow for this hobby) above **"Renew soon"** (remaining ≤ 1). Big number 34/500 remaining + "paid sessions left"; pills 18×6 per remaining (max 24); footer "Next: <first future session>".
- **Tabs** under the header (segmented, 38px, same style as Theme): `ticket` "Subscriptions" (default) / `calendar-blank` "All sessions" (ru «Общий календарь», uk «Спільний календар»).
- **All sessions tab** (`22-home-calendar`): month grid of every session of every hobby. Cells 48px radius 8: day number + **one** 6px status dot, and next to it the number of sessions (10px/500 neutral-300) when there is more than one. Dot colors: paid = paid-line fill · unpaid = neutral-500 outline · attended/forfeit = paid-line outline · pending = accent fill · cancelled/missed = neutral-700 fill. With several sessions the dot shows the most relevant status: pending → first unmarked (paid/unpaid) → attended → cancelled. Selected day = accent-900 bg + accent border (default today); today = neutral-700 border. Legend below. Under the grid: selected day title (full weekday, date) and its sessions sorted by time — hobby name 15px, "HH:MM · N min" 12px, status pill (Paid / Unpaid / Attended / Unmarked / Cancelled / Deducted), chevron. **Tap a row → that hobby's detail screen**, calendar month set to the session's month. Empty day → "No sessions on this day".
- **Empty state**: 88px accent-900 circle with `ticket` 48px, "No passes yet" 18/500, body 14px, primary "Add hobby" (`18-home-empty`).

### 2. Hobby detail
- Back · edit. Title 28/500, schedule 14px, **sync status component** (see Storage & sync; `19-sync-states`).
- Primary "Add payment". Stats: left / attended / per session.
- Month calendar: cells 44px radius 8, number 14px + time 9px.
  - paid: bg paid-fill · attended: 1px paid-line · forfeit: attended + line-through · missed/cancelled: neutral-800 border + line-through · unpaid: dashed neutral-600.
  - **pending: 1px accent border + 5px accent dot top-right**; tap → Attendance prompt for that session.
  - Legend: Paid · Unpaid · Attended · **Unmarked** · Cancelled.
- If pending > 0: accent-900 row button "N sessions need marking ›" → pending flow for this hobby.
- Upcoming sessions (future, unmarked; pending excluded), History, Payments — unchanged.

### 3. Create / Edit hobby
- Day rows **animate in** (260ms, opacity 0→1, translateY −6px→0, height grows) when a day chip is selected.
- **Duration** per day: combo field (input 36px + "min" + caret button). Type any number, or tap the caret to open a row of 5 chips **30 · 45 · 60 · 90 · 120** (34px pills, selected = accent-900 + accent border); picking one fills the field and closes the row.
- Unchanged fields: name, day chips, per-day time, "Same time for all days", first session / "Changes apply from", sessions, price + currency dropdown.
- Calendar choice removed → info row (surface, radius 8, 13px): `google-logo` **"'My Subscriptions' calendar · user@gmail.com"**.
- Summary box, "Create and add to calendar" / "Save changes", "Delete hobby".

### 4. Attendance prompt (single pending)
- Meta "Gym · Mon, Sep 21, 10:00", title "Did you attend the session?", body.
- Primary "I was there" · Secondary "Didn't happen — carry payment over" · Ghost **"Later"** (`11-attendance-prompt`).

### 5. Mark past sessions (≥ 2 pending)
- Title "Mark past sessions" 22/500; subtitle "N unmarked sessions".
- Ghost link "Mark all as attended" (`checks`).
- Scrollable list, oldest first, grouped by hobby (group header 13px accent-300). Row: date 15px, "HH:MM · N min" 12px neutral-500, two compact 36px toggles `check` "Attended" / `x` "Didn't happen" (unselected = divider border; Attended selected = paid-fill/paid-text; Didn't happen selected = neutral-800 + neutral-500 border). Tap again to clear.
- Pinned bottom: primary "Save" (disabled until ≥ 1 choice), ghost "Later". Only chosen rows are saved.
- After save: toast "Marked: N", then renewal reminders if any (`17-pending-list`).

### 6. Renewal reminder, 7. Add payment, 8. Session sheet (cancel / move / restore, "carry payment" and "move all following" switches)
Unchanged — see screenshots 04, 05, 06 and the prototype.

### 9. Settings (`09-settings`, `20-settings-account`)
1. Theme (Light/Dark). 2. Color scheme (4 cards). 3. Language.
4. **Google account**: avatar 32 (initials), name, email, "Last sync: today, 10:01"; rows "Sync now" (`arrows-clockwise`, spinner while syncing) and "Sign out" (`sign-out`).
5. **Google Calendar**: row "Calendar — My Subscriptions"; switch "Reminder before session" (sub "Sent by Google Calendar"), when on → segmented 15 / 30 / 60 min. Default off.
6. "Install the app" (`download-simple`) — only when not installed; opens the install sheet.
7. About. 8. Ghost accent "Delete all data" (`trash`) → confirm sheet ("Delete all data?", body, "Delete" / "Cancel").

### 10. About (`10-about`)
Icon, name, version; Author Ihor Korenets; License Proprietary; Contact support (`mailto:vik753@gmail.com`); GitHub; **Share the app** (Web Share API with the site URL; fallback: copy link + toast). "Rate on store" removed.

### Motion
All open/close transitions are animated (disabled with `prefers-reduced-motion`):
- **Screens** (Home, Detail, Create/Edit, Settings, About, Sign in): enter with opacity 0→1 + translateY 8px→0, 240ms `cubic-bezier(.2,.7,.2,1)`.
- **Bottom sheets**: backdrop fades in 220ms; sheet slides up from 100% in 300ms `cubic-bezier(.2,.8,.2,1)`. **Close**: sheet slides down 210ms `cubic-bezier(.4,0,1,1)` + backdrop fades out; state (e.g. clearing the selected session) is applied after the animation ends. Tapping the backdrop closes Session / Add payment / Install / Delete sheets (not the attendance prompts).
- **Inline reveals** (day rows in the form, duration presets, move-session calendar, reminder minutes, sign-in error box, install card): height + opacity + translateY −6px→0, 200–280ms.
- **Toasts**: slide up 12px + fade in 260ms; fade + slide out 250ms before removal (shown 3.2s total).
- Install card dismiss: fade out 220ms.

### Toasts
Bottom 96px, max-width 440 centered, neutral-800, radius 8, 13px, `check-circle` in paid-line, 3.2s.

---

## Design tokens
Unchanged from the previous handoff — see `tokens/theme-tokens.css` / `.json`.

Font **Inter** 400/500/600, headings max 500. Icons **Phosphor**. Spacing 2.8 / 5.6 / 8.4 / 11.2 / 16.8 / 22.4 px. Radii sm 4 · md 8 · lg 14 · sheet 28.

| Scheme | Neutral (h, c) | Accent (h, c) |
|---|---|---|
| Nocturne (default) | 280, 0.022 | 289, 0.12 |
| Sea | 235, 0.026 | 222, 0.11 |
| Clay | 60, 0.016 | 42, 0.13 |
| Graphite | 0, 0 | 5, 0.14 |

Ramp L for 100…900: `0.97 0.93 0.87 0.79 0.68 0.57 0.47 0.37 0.27`; light mode reverses the ramp. Paid palette (fixed): dark fill/line/text `oklch(.36 .08 155)` / `(.60 .10 155)` / `(.88 .09 155)`; light `(.90 .07 155)` / `(.58 .12 155)` / `(.36 .09 155)`. Exact generator: `themeVars()` in the prototype.

Buttons: primary = 1px accent outline, never filled. Secondary = divider border. Ghost = accent text. Focus = 2px accent outline, offset 2. Spinner = `circle-notch` rotating 0.9s linear.

## Localization
All strings in `L` (`ru`, `uk`, `en`) in the prototype script — copy to i18n JSON. New keys: `signIn, signInNote, signSub, feat1-3, signErr, signDenied, grant, install, installIOSa/b, installDesk, installBtn, installRow, pendingTitle, pendingCount, markAll, was, wasnt, later, saveBtn, tMarkedN, tagPending, legendPending, pendingRow, syncedL, syncing, offline, reauth, reauthBtn, lastSync, tSynced, tOffline, account, syncNow, signOut, calRow, reminderL, reminderSub, minBefore, emptyTitle, emptyBody, addHobby, wipe, wipeTitle, wipeBody, wipeBtn, tWiped, lastPaidNote, evDur, calInfo, tabList, tabCal, noSessionsDay`. Slavic plurals via `slav()`, English via `en()`.

## Assets
- `icons/app-icon-<scheme>-<dark|light>.png` — 360×360 references (8). Redraw as vector; export 192, 512 and a maskable 512 for the manifest, plus `apple-touch-icon` 180.
- Phosphor icons used: gear-six, plus, caret-left/right, pencil-simple, calendar-check, calendar-blank, calendar-dots, clock, clock-countdown, check, checks, x, x-circle, arrow-bend-up-right, arrow-counter-clockwise, arrows-clockwise, circle-notch, cloud-slash, warning, trash, copy, bell, info, envelope-simple, github-logo, share-network, google-logo, google-drive-logo, download-simple, ticket, sign-out, sun, moon, check-circle, circle, lock-simple.

## Files
- `design/Абонементы.dc.html` — interactive prototype (PWA version).
- `design/App Icon.dc.html` — app icon in all schemes.
- `design/support.js`, `design/_ds/…` — runtime + base stylesheet.
- `tokens/` — theme tokens (CSS + JSON). `icons/` — icon PNGs. `screenshots/` — see below.

## Screenshots (`screenshots/`, English, Nocturne dark unless noted)
01-home · 02-hobby-detail · 03-hobby-upcoming · 04-add-payment · 05-session-sheet · 06-move-session · 07-edit-hobby · 08-new-hobby · 09-settings · 10-about · 11-attendance-prompt · 12-home-light · 13-hobby-detail-light · 14-settings-light-sea · 15-sign-in · 15-sign-in-states (default / error / denied) · 16-install-hint · 17-pending-list · 18-home-empty · 19-sync-states (ok / syncing / offline / reauth / Home offline icon) · 20-settings-account · 21-desktop · 22-home-calendar.

## Step-by-step guide
See `ИНСТРУКЦИЯ.md` (Russian) — ready-to-paste prompts for each step.

## Suggested implementation order
1. Vite + React + TS project, PWA manifest + service worker, theme tokens, i18n.
2. Data model, IndexedDB, session/payment engine incl. pending rule — unit tests (Vitest).
3. Google sign-in (GIS), scopes, sign-in screen states.
4. Home, Hobby detail, Create/Edit, Add payment, Session sheet.
5. App open check: attendance prompt, pending list, renewal reminder + snooze.
6. Google Calendar: create calendar, event diffing, colors, description, reminders.
7. Google Drive appData backup, offline queue, sync status component.
8. Settings (account, calendar reminder, install, delete all), About, install hint, desktop layout.
9. Icons, deploy (any static host with HTTPS, e.g. Vercel / Netlify / GitHub Pages).
