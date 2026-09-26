# Review notes — local-first (decision 12)

**Scope reviewed (2026-09-26):** `dev...feat/local-first` (5f601b9, 6cb7e8e, 7e346b7, 3eb560f): types/mutations (`hobby.google`), migrate v3, syncStore (calendar filter, 'off' purge, backup filter, hadBackup, wipe keeps file id), authStore (usesGoogle, silent renewal gate), App (gate removed, init after load, sign-in toasts), HobbyForm switches + sign-in after save, HobbyDetail local note, Home icon, Settings sign-in row, i18n uk/en/ru.
**Checks (run by reviewer):** typecheck, lint, 387 unit tests green. e2e not re-run.
**Verdict:** CHANGES REQUESTED.

## Findings

| #   | Sev     | Where                          | Problem → fix                                                                                                                                                                                                                        | Status |
| --- | ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | blocker | syncStore.ts:153-163           | Account switch (A signed out, B signs in) replaces local data with defaultState → local-only and calendar-only hobbies (never in any Drive) are lost. Keep hobbies with `!google.backup` (decide: keep calendar-only ones too); test | fixed  |
| 2   | major   | syncStore.ts:285-293, merge.ts | Backup on→off never reaches other devices: device B keeps H (backup=true) and re-uploads it; A and B ping-pong the file; B's later edit wins on A and re-enables backup. Needs a published opt-out marker (user decision)            | fixed  |
| 3   | major   | HobbyForm.tsx:156-160,48,54    | Edit save: leave() = navigate(-1) is async, signIn() stores RETURN_KEY = /hobby/x/edit → back from Google into the form. Pass the target route to signIn / set returnTo explicitly                                                   | fixed  |
| 4   | major   | HobbyForm.tsx:159              | Sign-in fires on every save of a Google hobby while not signed in (after denial, sign-out, migrated v2 hobbies) — spec: only when an option is first turned on. Compare against hobby.google                                         | fixed  |
| 5   | minor   | App.tsx:56-59                  | Error/denied toast re-shown on every language change while status stays error/denied. Depend on auth only / read t via getState                                                                                                      | fixed  |
| 6   | minor   | syncStore.ts:287-291           | Backup doc still carries local-only hobby ids in deletedHobbies and settings.renewSnoozedUntil. Filter to backed-up ids                                                                                                              | fixed  |

## Unchecked

e2e specs content, CSS token use in new HobbyForm/HobbyDetail styles, 44px on switches rows, screenshots, README/family-guide wording.

**Fixes (2026-09-26), all with tests:** #1 backed-up hobbies leave on an account switch, local ones stay (calendar-only ones get their calendar switched off so they don't land in the new account's calendar). #2 the Drive copy publishes `backupOff` (id → updatedAt); other devices switch the backup off and keep the hobby locally. #3 `signIn(returnTo)` brings the user back to the hobby. #4 sign-in only when an option was switched on in this save. #5 toast depends on the auth status only. #6 the copy only carries ids that were ever backed up (tracked in sync bookkeeping). Semantics of #1/#2 decided by Claude, listed for the user's approval.

## Next steps

User approval of the #1/#2 semantics.
