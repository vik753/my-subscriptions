---
paths:
  - 'src/services/**'
  - 'src/store/**'
---

# Google sync & storage rules

- Local-first: IndexedDB is written first; network ops go through the persistent outbox and must be idempotent and retry-safe (exponential backoff, respect 429/403 rate limits).
- Calendar: work only inside the app-created "My Subscriptions" calendar. Keep `sessionKey → eventId` mapping; create/update/delete only changed events; store `sessionKey` + `hobbyId` in `extendedProperties.private` so the mapping can be rebuilt.
- Event colors: paid = Basil, unpaid = Graphite, attended = Sage (per `colorId`). Title/description strings come from i18n.
- Drive: one JSON document in `appDataFolder` with `schemaVersion`; debounce uploads; on conflict, newest `updatedAt` per hobby wins.
- Auth: Google Identity Services in the browser, no client secret, no backend. Token expiry is normal — surface "sign in again" state, never lose queued changes.
- Every schema change bumps `schemaVersion` and adds a migration with a test.
- Never log tokens, emails or user data.
