# Contributing

Thanks for looking! This is a personal project but PRs and issues are welcome.

## Dev setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## Before submitting a PR

```bash
npm run lint
npm run typecheck
npm run test
```

## Guidelines

- Keep the dependency tree small. New runtime deps need justification.
- Amounts are always integer minor units. Never introduce float math on money.
- Keep the SQLite-only assumption. No Postgres adapters, no Redis.
- Don't add telemetry, analytics, or external HTTP calls.
- UI copy: English first, Norwegian translations welcome (`apps/frontend/src/i18n/`).

## Reporting bugs

Use the issue template. Please attach:
- Browser + OS
- What you did
- What happened vs what you expected
- `data/app.sqlite` schema version (shown on Settings page)
