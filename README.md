# My Subscriptions

**Track prepaid class passes — gym, lessons, any hobby — right from your phone.**

My Subscriptions shows how many paid sessions are left on each pass, asks after every session whether
you went, moves the payment on when a session is cancelled, and reminds you when it's time to renew.

**Your data stays on your phone by default** — no account, no sign-in. For each hobby you can
choose to also put its sessions into **Google Calendar** (paid ones in green) and to back it up
to **Google Drive**.

It is a **PWA (Progressive Web App)** made for phones. You don't need an app store: open a link, add it to
the Home Screen, and it runs full screen like a regular app, offline too.

**Open the app:** https://vik753.github.io/my-subscriptions/

<p>
  <img src="docs/screenshots/home.png" width="240" alt="Home: passes with paid sessions left">
  <img src="docs/screenshots/hobby.png" width="240" alt="Hobby: stats and month calendar">
  <img src="docs/screenshots/all-sessions.png" width="240" alt="All sessions: every hobby on one calendar">
</p>

## Features

- **Passes at a glance:** for each hobby you see the paid sessions left, the next session and a
  "Renew soon" tag when one is left.
- **Attendance check when the app opens:** past sessions you haven't marked are listed, and you
  answer "Attended" or "Didn't happen". There are no push notifications and nothing runs in the
  background.
- **Payments carry over:** if a session didn't happen or you cancel it, the payment moves to the
  next session. You can also cancel without carrying it over (the session is deducted).
- **Move sessions:** move one session, or all following ones, to another day and time.
- **Renewal reminder:** when one paid session is left, the app suggests adding a payment. You can
  snooze it until tomorrow.
- **Local first:** everything is stored on the phone; the app works without an account or internet.
- **Google Calendar (optional, per hobby):** a separate "My Subscriptions" calendar with one event
  per session:
  - Paid sessions in the color you pick (Google's 11 event colors; green by default), unpaid grey,
    attended sage; a session cancelled without carrying the payment over is crossed out in grey.
  - **Guests:** add someone's email (e.g. your partner) and the sessions show in their calendar too.
  - An optional popup reminder before each session is sent by Google Calendar.
- **Google Drive backup (optional, per hobby):** a copy in a hidden app folder in your own Drive,
  so several phones and computers stay in sync.
- **Works offline:** with the Google options on, changes sync when the internet is back.
- **Three languages** (Ukrainian, English, Russian), **light and dark themes**, **four color schemes**.

## Install

### iPhone / iPad (Safari or Chrome)

<img src="docs/screenshots/install-add-to-home-screen.png" width="240" align="right" alt="Share menu with Add to Home Screen highlighted">

1. Open https://vik753.github.io/my-subscriptions/ in **Safari** or **Chrome**. If the link
   opened inside Telegram, Instagram or another app, open it in the browser first.
2. Tap **Share** (the square with an arrow), scroll down and tap **Add to Home Screen** (see the
   picture), then **Add**.
3. Start the app from its new icon on the Home Screen.

<br clear="right">

### Android (Chrome)

1. Open the link in **Chrome**.
2. Tap **Install** on the card at the top of the app (or ⋮ → **Install app**).
3. Start the app from its new icon.

### Computer (Chrome / Edge)

Open the link and click the install icon in the address bar, or just use it in a browser tab.
On wide screens the app shows as a centered column.

## Google Calendar and Drive (optional)

You don't need a Google account to use the app. Google is only involved for the hobbies where you
turn it on, in the hobby form:

- **Add to Google Calendar:** the hobby's sessions appear in a separate "My Subscriptions"
  calendar and stay up to date. Turning it off later removes them from the calendar; the hobby
  stays on your phone. With it on you can also pick the **color of paid sessions** and add
  **guests**: people whose Google Calendar should show the sessions too (they get the events
  without an email per session). Every change (a moved or cancelled session, a new payment, a
  deleted hobby, removing the guest) reaches their calendar too, since it's the same event. The
  color is personal in Google Calendar: guests see the sessions in their own calendar's color.
  A guest needs a Google account; if the sessions don't show up
  for them, they set Google Calendar → Settings → "Add invitations to my calendar" to
  "From everyone".
- **Back up to Google Drive:** the hobby is saved to a hidden app folder in your Drive and synced
  to your other devices.

The first time you turn one on, the app asks you to sign in with Google (you can also sign in from
Settings):

1. Choose your account.
2. Google may warn that **"Google hasn't verified this app"**. This is a family app that isn't
   published in a store. Tap **Advanced → Go to My Subscriptions**.
3. Allow both permissions:
   - **Calendar:** only the app's own "My Subscriptions" calendar. Your other calendars stay private.
   - **Google Drive:** only the app's hidden folder. Your files stay private.

The app has no server. Your data stays on your device and, if you choose, in your own Google
account; nobody else, including the author, can see it.

## How to use

### 1. Add a hobby

<img src="docs/screenshots/form.png" width="240" align="right" alt="New hobby form with the Google options">

Tap **+** on the Home screen and fill in:

- the name;
- the days of the week, with a time and duration for each;
- the date of the first session;
- how many sessions the pass has and what it cost;
- optionally, **Add to Google Calendar** and **Back up to Google Drive**.

The summary under the form shows what will be created. **Create** saves the hobby on the phone
(with the calendar option on, the button says **Create and add to calendar**, and the sessions
appear in Google Calendar a moment later).

<br clear="right">

To change the schedule later, open the hobby → ✏️. Changes apply from the date you choose; past
sessions and marks stay as they are.

### 2. Mark sessions after they happen

<img src="docs/screenshots/mark-past.png" width="240" align="right" alt="Mark past sessions">

When you open the app after a session, it asks **"Did you attend the session?"**. If several
sessions are waiting, you get a list instead:

- **Attended** uses one paid session.
- **Didn't happen** keeps the payment, which moves to the next session.
- **Later** hides the question until the next time you open the app. Unmarked sessions show an
  "Unmarked" tag on the card and an outlined day with a dot in the calendar.

<br clear="right">

### 3. Look at a hobby

Tap a card to see:

- the paid sessions left, the sessions attended and the price per session;
- a month calendar: green = paid, dashed = unpaid, outlined = attended, crossed out = cancelled;
- the upcoming sessions, the history and the payments.

### 4. Cancel, move or restore a session

<img src="docs/screenshots/session.png" width="240" align="right" alt="Session sheet">

Tap a session in the calendar or in **Upcoming sessions**:

- **Move to another day:** pick a date and time. Turn on **"Also move all following sessions on
  this day"** to change the schedule from then on.
- **Cancel session:** for a paid session the app asks **"Carry the payment over?"** — move the
  payment to the next unpaid session, or don't carry it (the session is deducted from the pass).
- **Restore session:** tap a cancelled session to undo the cancellation.

<br clear="right">

### 5. Add a payment

<img src="docs/screenshots/payment.png" width="240" align="right" alt="Add payment">

Tap **Add payment** on the hobby. Choose one of:

- **One session:** a single paid session.
- **Several sessions:** a new pass.

Empty fields repeat your last payment. The hint shows which sessions the payment will cover, and
they turn green in the app and in Google Calendar.

Made a mistake? Tap a payment in the hobby's **Payments** list (or in ✏️ edit) to correct its
date, sessions or amount, or to delete it.

When only one paid session is left, the app suggests this by itself. **Remind me later** snoozes it
until tomorrow.

<br clear="right">

### 6. See all hobbies together

The **All sessions** tab on the Home screen puts every session of every hobby on one month calendar.
Tap a day to see its sessions, and tap a session to open its hobby.

### 7. Settings

<img src="docs/screenshots/settings-light.png" width="240" align="right" alt="Settings in light theme, Sea scheme">

Tap ⚙️ on the Home screen:

- **Theme** (light / dark), **color scheme** (Nocturne, Sea, Clay, Graphite) and **language**.
- **Google account:** **Sign in with Google**, or, once signed in, the time of the last sync,
  **Sync now** and **Sign out**.
- **Reminder before session:** a Google Calendar popup 15, 30 or 60 minutes before each session.
- **Install the app** (if it isn't installed yet), **About**, and **Delete all data**, which
  removes your hobbies, the "My Subscriptions" calendar and the Drive backup.

<br clear="right">

### Good to know

- **Where a hobby lives:** a local hobby shows "Stored only on this phone". A hobby with a Google
  option shows its sync status: "Synced with Google Calendar", or "Offline — changes will sync later"
  when you have no internet right now.
- **"Sign in again to sync":** Google sessions expire from time to time. Tap **Sign in**; your data
  stays on the phone meanwhile.
- **Several devices:** turn on the Drive backup and sign in with the same Google account; the
  backed-up hobbies are merged automatically.
- **Updates:** when a new version is out, a banner appears at the top. Tap **Update**.

## Credits

- **Idea:** Netrebko Olena (Нетребко Олена)
- **Developed by:** Ihor Korenets (Ігор Коренець) with Claude (Anthropic)

## Questions and support

Write to vik753@gmail.com (also in Settings → About → Contact support). A short guide to send to
family and friends is in [`docs/family-guide.md`](docs/family-guide.md).

---

## For developers

- Stack: Vite, React, TypeScript (strict), vite-plugin-pwa (Workbox), React Router, Zustand,
  IndexedDB (`idb`), Vitest + Testing Library, Playwright (WebKit + Chromium), CSS Modules.
- Local first: IndexedDB is the source of truth. Google is opt-in per hobby (`hobby.google`):
  OAuth 2.0 token flow in the browser (no client secret, no backend) with the scopes
  `calendar.app.created` and `drive.appdata`, requested only when a hobby opts in.
- The product spec is [`design_handoff_my_subscriptions/README.md`](design_handoff_my_subscriptions/README.md)
  plus [`docs/design-review.md`](docs/design-review.md). The plan is [`docs/roadmap.md`](docs/roadmap.md).
  Engineering rules are in [`CLAUDE.md`](CLAUDE.md).

### Run locally

Requires Node 24 (`nvm use`).

```sh
npm ci
cp .env.example .env.local   # set VITE_GOOGLE_CLIENT_ID
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:coverage`
(`src/domain` must stay at 100%), `npm run test:e2e`.

### How it works

Everything derives from one pure function. `summarize(hobby, now)` in `src/domain` generates
the sessions and their statuses from the schedule, payments and marks.

1. A change is saved to IndexedDB first.
2. The sync pass merges the Drive copy of `state.json` (per hobby, with tombstones for deleted ones).
3. It writes only the calendar events whose content changed, using deterministic event ids, so
   retrying a write never creates duplicates.
4. It uploads the backup if it changed.

### Screenshots

The images in `docs/screenshots/` come from a real build with Google faked:

```sh
BASE_PATH=/ npm run build && npx vite preview --port 4173 &
node scripts/capture-screenshots.mjs
```

### Workflow

Work happens on `dev`. `main` receives changes only through pull requests with green CI and deploys
to GitHub Pages.
