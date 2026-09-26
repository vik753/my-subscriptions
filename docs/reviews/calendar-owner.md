# Review: calendar owner shown to guests (feat/calendar-owner)

## Scope reviewed

- Commit 5acfa9c: src/store/syncStore.ts, src/services/calendarApi.ts, src/i18n/messages/{uk,en,ru}.ts,
  src/i18n/changelog.ts, src/store/syncStore.test.ts, docs (design-review 13, privacy, README, CHANGELOG).
- Checks run 2026-09-26: typecheck, lint, 472 unit tests: all green.

## Findings

- [major] open: syncStore.ts:303-307, a failing `renameCalendar` (any persistent non-401/404, e.g. 403)
  throws out of `sync()` before the event diff, so all calendar sync stops on every run. Fix: try/catch
  the rename, leave `calendarName` unchanged so it retries later, then continue with the events.
- [minor] open: no test for an account-name change (calendarName = old name, then rename) or for a rename
  failure not blocking events.
- [minor] open: en/uk/ru `calInfo` (HobbyForm.tsx:337) still says the calendar is "My Subscriptions";
  the calendar is now called "My Subscriptions · <name>".
- [minor] (unverified) the scope list for `calendars.patch` in Google's docs was not checked live. From
  memory, `calendar.app.created` covers get/patch/update/delete on calendars the app created.

## Verified OK

- The rename runs only when `owner` is set. `owner` is null only when `user` is null; `account` is then
  null too, so meta resets.
- No user or no guests: no Organizer line. Only events with guests change hash, so they are re-upserted once.
- Account switch, calendar recreated (after 404 or exists=false), wipeAllData and wipeGoogleData all
  go through emptyMeta, so calendarName becomes null. Old meta without the field reads as null and
  gets one rename.
- Multi-device: calendarName is kept per device, so each device does at most one idempotent PATCH.
  A device with a stale cached name does not rename, because its own calendarName already matches.
  No ping-pong.
- i18n: evOrganizer is in all three languages; changelog entries are in all three.

## Next steps

- Re-check once the rename-failure handling lands.

**Fixes (2026-09-26):** a failed rename no longer stops the sync (only 401 propagates; the rename
is retried next run) — test; test for a changed profile name; `calInfo` no longer names the
calendar ("The app's own calendar · email", uk/en/ru). Scope confirmed in Google's reference:
`calendars.patch` accepts `calendar.app.created`.
