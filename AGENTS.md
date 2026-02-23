# Stash — Agent Guidelines

## Commit Messages

Always use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

<optional body>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

**Scopes:** `api`, `mobile`, `db`, `auth`, `groups`, `spots`, `infra`, `e2e`, `ci`

Examples:
- `feat(api): add spots CRUD routes with visibility access control`
- `fix(auth): handle expired Clerk JWT tokens gracefully`
- `test(api): cover group membership edge cases`
- `chore: update dependencies`

## Project Structure

Monorepo with npm workspaces:
- `apps/mobile` — Expo (React Native) app
- `workers/api` — Cloudflare Workers + Hono API
- `packages/api-client` — Typed API client (hono/client)
- `packages/api-types` — Shared type re-exports

## Development

- Run `sst dev` for local development
- Run `npm run test:unit` for worker unit tests (vitest)
- Run `npm run test:e2e` for Playwright API tests
- Run `npm run test:mobile` for Maestro mobile E2E flows
- Never deploy to preview or production — leave that to CI/humans

## Key Rules

- Never trust client-supplied user IDs — always derive from verified Clerk JWT
- Enforce spot visibility (private/group/public) at the DB query level
- Use `nanoid` for spot and group IDs
- Spot tags are normalized in `spot_tags` table, not comma-separated
- Invite codes: 6-char alphanumeric uppercase, formatted as `SK8-XXXXXX`
