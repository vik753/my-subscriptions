# My Subscriptions

PWA for tracking prepaid class passes (gym, lessons, any hobby) with Google Calendar and Google Drive. No backend.

- Product spec: [`design_handoff_my_subscriptions/README.md`](design_handoff_my_subscriptions/README.md) + [`docs/design-review.md`](docs/design-review.md)
- Engineering rules: [`CLAUDE.md`](CLAUDE.md)

## Development

Requires Node 24 (`nvm use`).

```sh
npm ci
cp .env.example .env.local   # set VITE_GOOGLE_CLIENT_ID
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`.

## Workflow

Work happens on `dev`; `main` receives changes only through pull requests with green CI and is deployed to GitHub Pages.
