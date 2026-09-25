# My Subscriptions

PWA for tracking prepaid class passes (gym, lessons, any hobby). Users are family and friends; installed to the Home Screen by link, no app stores. Google-only: Google Calendar API + Google Drive `appDataFolder`. **No backend server, no push notifications** — attendance is asked when the app opens.

## 🗣 Language

**Answer me in whatever language I am writing in. Write English into every file.** Follow my lead in conversation — if I switch languages, switch with me. Explanations, reports and discussion are in my language, not the file's.

## General Rules

- Product spec (source of truth): `design_handoff_my_subscriptions/README.md` (PWA handoff, **approved 2026-09-25**) + `docs/design-review.md` (decisions and fixes — overrides the README where they differ). `docs/design-brief-pwa.md` is historical only. If unclear, ask — don't invent behavior.
- `design_handoff_my_subscriptions/` is read-only reference. Never edit it.
- Work follows `docs/roadmap.md` stage by stage; update its checkboxes and status line when a stage ships.

## Stack

Vite · React · TypeScript (strict) · vite-plugin-pwa (Workbox) · React Router · Zustand · IndexedDB (`idb`) · date-fns · Vitest + Testing Library · Playwright (WebKit + Chromium, 390×844) · ESLint + Prettier · CSS Modules + CSS custom properties. Adding any other runtime dependency needs a one-line justification to the user first.

## Commands

```
npm run dev         # local dev server
npm run build       # typecheck + production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint + prettier --check
npm test            # vitest run (unit)
npm run test:e2e    # playwright (builds + previews automatically)
npm run test:coverage  # unit + coverage (src/domain must stay at 100%)
npm run format      # prettier --write
```

Run a single test file while iterating: `npx vitest run src/domain/sessions.test.ts`.

## Architecture

```
src/
  domain/    pure TS: model, session generation, payments, statuses, moves, schedule segments
  services/  side effects: google auth, calendar sync, drive backup, sync outbox, install prompt
  store/     Zustand stores + IndexedDB persistence + schema migrations
  screens/   one folder per screen/sheet (Home, HobbyDetail, HobbyForm, Settings, About, sheets/)
  ui/        reusable presentational components (Button, Card, Sheet, Switch, MonthCalendar, Toast…)
  i18n/      uk/en/ru dictionaries, plural rules, date & money formatting
  theme/     tokens.css (from design tokens), scheme × mode switching
```

Dependency direction (enforced by ESLint `import/no-restricted-paths`): `screens → ui, store, i18n, theme` · `store → domain, services` · `services → domain` · **`domain → nothing`** (no React, no browser APIs, no `Date.now()` — `today` is always a parameter).

Core flow — everything derives from one pure function:

1. User action mutates a `Hobby` in the store (persisted to IndexedDB immediately — local-first).
2. `computeSessions(hobby, today)` recomputes sessions and statuses.
3. Sync layer diffs the result against stored `sessionKey → eventId` and enqueues only changed calendar ops in the outbox.
4. Outbox flushes to Google when online and authorized; Drive backup is debounced.

Never store derived values (`remaining`, statuses, `paid`/`price` totals) — compute from `payments` and `marks`.

## Code rules

- TypeScript strict. No `any`, no `@ts-ignore`, no `eslint-disable` without a comment explaining why.
- Function components + hooks. Named exports. One component per file. Files `PascalCase.tsx` for components, `camelCase.ts` otherwise.
- Dates: store as `'YYYY-MM-DD'` / `'HH:MM'` strings in local time; never mutate `Date` objects; weekday 0 = Monday.
- Money: integers in minor units (kopecks/cents); format only in `i18n/`.
- All user-visible text via i18n in **all three languages** (uk, en, ru) with correct Slavic plurals. No hardcoded strings in JSX.
- Styling only via theme tokens (`var(--color-…)`, spacing, radii). No hex/rgb literals, no magic sizes outside the spec.
- Comments explain _why_, not _what_. Don't leave commented-out code or `console.log`.
- Keep changes minimal and on-task; no drive-by refactors or reformatting of untouched code.

## Never

- Push to, commit on, or merge into `main`. Never force-push. Never rewrite published history.
- Add a backend, serverless function, or third-party analytics/tracking.
- Request Google scopes beyond `calendar.app.created` (+ what it needs) and `drive.appdata`. Never touch the user's other calendars or files.
- Commit secrets or `.env*` (except `.env.example`). The OAuth client ID lives in `.env.local`.
- Use `localStorage` for app data (only for tiny UI prefs).
- Mark a task done with failing typecheck, lint, or tests — or claim a check passed without running it.

## Git workflow

- Branches: work on `dev`. For larger tasks branch `feat/<short-name>` / `fix/<short-name>` from `dev` and merge back into `dev`.
- Claude commits and pushes to `dev` without asking. Then opens (or updates) a PR `dev → main` with `gh pr create --base main --head dev`. **The user merges PRs into `main` personally.**
- Before every commit: `npm run typecheck && npm run lint && npm test` must pass. Enforced by husky (`pre-commit`: lint-staged + typecheck, `pre-push`: tests + build), by `.claude/hooks/guard-git.mjs` (blocks `main`, force-push, `--no-verify`, `gh pr merge`) and by CI (`.github/workflows/ci.yml`) — `main` accepts only PRs with green CI.
- Ship finished work with `/ship`.
- The only PRs in this repo are `dev → main`. Dependabot PRs (target `dev`): evaluate, port accepted updates as regular commits on `dev`, then close the PR with a comment (`gh pr close <n> --comment ...`). Never merge PRs.
- Conventional Commits: `feat(domain): carry payment over on cancel`. Small, focused commits.
- PR description: what changed, how it was verified, screenshots for UI changes, open questions.

## Agents (`.claude/agents/`)

Use exactly these, at these points — no others, no ad-hoc subagents:

- `spec-tester` — before implementing or changing a rule in `src/domain`: writes tests from the spec, without seeing the implementation.
- `ui-verifier` — after building or changing a screen/sheet: compares with design screenshots, returns text only.
- `reviewer` — before opening/updating the PR (part of `/ship`).

Give agents a precise brief (rule/screen, files, screenshot names); they start cold.

## Definition of done

Spec behavior implemented · unit tests for domain changes · all three languages · light + dark and all 4 schemes look right · works at 390px width and ≥1024px (centered 480px column) · checks green · pushed to `dev`, PR updated.

## Token economy (quality first)

- Locate before reading: `grep -n` / Glob first, then Read only the needed range (`offset`/`limit`). Never read whole large files — especially `design_handoff_my_subscriptions/design/Абонементы.dc.html` (~100 KB): grep the relevant function or `L` key.
- Look at design screenshots only for the screen being built; images are expensive.
- Don't re-read a file after editing it; don't re-run a command whose output you already have.
- Trim command output: `| tail -40`, `--reporter=dot`, run single test files while iterating; full suite once before commit.
- Subagents only as listed in **Agents**. Do searches directly.
- Answers: short, no restating the plan or the diff; link files as `path:line` instead of pasting code.
- Batch independent tool calls in one turn.
- When a fact is established in the conversation or in these docs, use it — don't re-derive or re-verify it.
- Keep this file under ~150 lines; area-specific rules live in `.claude/rules/` and load only when relevant.

### On the Twelve Factors

[12factor.net](https://12factor.net/) was written for server-side apps with backing services and processes. This is a static client-side bundle, so most of it does not apply — there are no processes to scale, no ports to bind, no backing services to attach, no admin tasks to run. What is worth honouring here:

- **[Codebase](https://12factor.net/codebase)** — one repo, one deploy target.
- **[Dependencies](https://12factor.net/dependencies)** — declared in `package.json`, locked in `package-lock.json`, installed with `npm ci` in CI. Never assume a global tool.
- **[Config](https://12factor.net/config)** — anything environment-specific belongs in Vite env vars, never hardcoded. (Today there is none beyond `base`.)
- **[Build, release, run](https://12factor.net/build-release-run)** — the build is reproducible and separate from serving; `dist/` is an artefact, never edited by hand.
- **[Dev/prod parity](https://12factor.net/dev-prod-parity)** — same Node version locally and in CI. Remember `dev` does not apply the Pages base path; `preview` does.
