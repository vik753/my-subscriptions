# Changelog

User-facing changes, newest first. Versions follow [Semantic Versioning](https://semver.org/):
a new feature bumps the minor number, a fix the patch number. The app shows the same list in
three languages under **About → What's new** (`src/i18n/changelog.ts`) — keep both in step.

## [1.5.0] — 2026-10-09

- Pay after the fact: _First paid session_ in _Add payment_ also lists sessions that were attended
  but not paid, labelled with their status; the oldest one is preselected.
- A session that was attended but not paid no longer looks like a paid one: grey outline in the
  calendar, "Attended · unpaid" in the history. Tapping it in the hobby calendar opens _Add payment_.
  A session cancelled with deduction that nobody paid for is crossed out and reads "Cancelled ·
  unpaid"; it can be paid from its sheet.

## [1.4.0] — 2026-09-29

- _Correct payment_ in the session sheet of a paid session opens the payment that covers it.
- _Add payment_ suggests the amount (last price per session × sessions) and keeps it editable.

## [1.3.1] — 2026-09-26

- Session length presets open in the phone's native picker, like the currency; the schedule
  row no longer stretches.
- The Settings button on Home is an outlined circle like the "+" next to it.

## [1.3.0] — 2026-09-26

- Choose which session a new payment starts from (_First paid session_ in _Add payment_).
- _Pay for this session_ in the session sheet of an unpaid session.
- Session length presets open as a vertical list.
- _What's new_ page in About, and an "Updated to …" note once after each update.
- The calendar is named after its owner ("My Subscriptions · Name") and events with guests say
  "Organizer: Name (email)" — Google shows the calendar, not the person, as the organizer.

## [1.2.1] — 2026-09-26

- Privacy policy and homepage for Google OAuth verification; linked in About.

## [1.2.0] — 2026-09-26

- Recorded payments can be corrected or deleted.
- Cancelling a paid session asks whether to carry the payment over.
- Sessions cancelled without carrying the payment over are crossed out in grey in Google Calendar.
- Delete data: everything, or only from Google.

## [1.1.0] — 2026-09-26

- Local first: data stays on the phone; Google Calendar and Drive backup are options per hobby.
- Calendar guests, and a choice of Google's color for paid sessions.
- Credits for the idea's author and the developers.

## [1.0.1] — 2026-09-26

- Deleting a hobby removes all its calendar events without a manual sync, and confirms it.
- A failed sync retries by itself.

## [1.0.0] — 2026-09-26

- First release: hobbies with passes, session calendar, payments, attendance asked on open,
  renewal reminders, Google Calendar sync, Google Drive backup, installable offline PWA.
