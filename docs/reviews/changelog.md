# Review: changelog (feat/changelog vs origin/dev)

## Scope (2026-09-26)

Commit 59283cc: src/i18n/changelog.ts, CHANGELOG.md, src/store/whatsNewStore.ts, src/screens/Changelog/_,
src/screens/WhatsNewBanner._, About row, App wiring (+ /changelog route), tests, e2e a11y of /changelog,
CLAUDE.md release rule, version 1.3.0. Reviewer ran: typecheck OK, lint OK, 465 unit tests pass. E2E not re-run.

Verified OK: layer boundaries (store → i18n, screens → i18n/store/ui); uk/en/ru keys + notes in step (test);
tokens only, mirrors UpdateBanner CSS; `ui.seenVersion` is a UI pref like installStore; primary Button is the
outlined variant; × button 44px with aria-label; init runs after IDB load (routes not rendered before
`ready`); fresh install / new device before Drive restore → silent; wipe/merge don't touch the pref;
private mode degrades to "note may reappear". Notes match PRs #17 (1.0.0), #18+#19 (1.0.1), #20 (1.1.0),
#21+#22 (1.2.0), #23 (1.2.1), #24 + this (1.3.0).

## Findings

- [minor] open — src/App.tsx:77 + src/screens/Changelog/Changelog.tsx:18 — launching/reloading on
  /changelog (e.g. tapping Update on UpdateBanner while there): child effect `seen()` runs before the
  parent's `init()` in the same commit, so the note then appears on the changelog page itself.
  Fix: in Changelog, `useEffect(() => { if (announce) seen() }, [announce])` with a selector.
- [minor] open — src/screens/Changelog/Changelog.tsx:33 — badge inside h2 gives name "Version 1.3.0current"
  (no separator; test at Changelog.test.tsx:36 asserts it). Add `{' '}` before the span or move badge out of h2.
- [minor] open — src/store/whatsNewStore.ts:40 — any `last !== current` announces, incl. a rollback
  (seen 1.4.0, running 1.3.0 → "Updated to 1.3.0"). Announce only if current is newer than last.
- [minor] open (unverified in AT) — src/screens/WhatsNewBanner.tsx:17 — role=status mounted together with
  its text is often not announced (same pattern as UpdateBanner). Accept or render an empty live region first.
- [minor] open — src/screens/Changelog/Changelog.tsx:24 — back always goes to About even when opened from
  the banner on Home/hobby. Consider navigate(-1) when there is history.
- [nit] open — src/screens/About/About.tsx:66,74 — version shown twice on About (footer + What's new row).
- [nit] open — src/i18n/changelog.ts:39 — 1.2.1 (new About link) is a feature by the new rule → would be
  minor; historical, fine to leave. 1.0.1 could mention auto-retry of failed syncs (PR #19).

## Unchecked / next

E2E not re-run; visual check of banner at 390px (text + button + × may wrap in uk/ru) not done.

**Fixes (2026-09-26):** seen-on-open reacts to a note that appears after mount; space before the "current" badge; rollbacks are not announced (numeric compare, tests); Back returns to where the note was opened; 1.0.1 mentions auto-retry. Accepted as is: `role=status` banner (same as UpdateBanner), version shown twice on About (footer is from the design), 1.2.1 stays a patch (historical).
