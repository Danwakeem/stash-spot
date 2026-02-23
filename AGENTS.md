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

Monorepo with npm workspaces (`apps/*`, `packages/*`, `workers/*`):

```
stash-spot/
├── apps/
│   └── mobile/                    # Expo SDK 54 (React Native 0.81, React 19)
│       ├── app/                   # Expo Router v6 file-based routing
│       │   ├── _layout.tsx        # Root layout — ClerkProvider + StatusBar
│       │   ├── index.tsx          # Entry redirect (auth check)
│       │   ├── (auth)/            # Sign-in / sign-up screens
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx
│       │   │   └── sign-up.tsx
│       │   ├── (tabs)/            # Main tab navigator
│       │   │   ├── _layout.tsx    # Tab bar config (map, feed, profile)
│       │   │   ├── map.tsx        # MapView with spot markers
│       │   │   ├── feed.tsx       # Spot feed list
│       │   │   └── profile.tsx    # User profile
│       │   └── spot/              # Spot detail stack
│       │       ├── _layout.tsx
│       │       ├── [id].tsx       # Spot detail (view/delete)
│       │       └── add.tsx        # Add new spot form
│       ├── components/
│       │   └── SpotCard.tsx
│       ├── hooks/
│       │   ├── useSpots.ts
│       │   └── useGroups.ts
│       └── lib/
│           ├── api.ts             # API base URL config
│           ├── clerk.ts           # Clerk tokenCache via expo-secure-store
│           └── theme.ts           # Colors, fonts, spacing constants
│
├── workers/
│   └── api/                       # Cloudflare Worker — Hono framework
│       └── src/
│           ├── index.ts           # App entry — mounts routes on /api/v1
│           ├── types.ts           # Env type (D1, R2, Clerk keys, DO)
│           ├── middleware/
│           │   └── auth.ts        # Clerk JWT verification → c.set("userId")
│           ├── routes/
│           │   ├── spots.ts       # CRUD + group sharing + tag filtering
│           │   ├── spots.test.ts  # Vitest unit tests (7 tests)
│           │   ├── groups.ts      # CRUD + invite codes + membership
│           │   └── users.ts       # GET/PATCH /users/me (auto-create on first sign-in)
│           ├── durable-objects/
│           │   └── SpotPresence.ts # Tracks live viewers per spot
│           ├── db/
│           │   ├── schema.ts      # TS interfaces, VALID_TAGS, query helpers
│           │   ├── migrations/
│           │   │   └── 0001_initial.sql  # users, spots, groups, group_members, spot_groups, spot_tags
│           │   ├── seed.ts        # Creates test users via Clerk + seed spots
│           │   ├── migrate.ts     # Applies migrations via Cloudflare D1 REST API
│           │   └── teardown.ts    # Drops all tables (for CI cleanup)
│           └── test-utils.ts      # Test helpers
│
├── packages/
│   ├── api-types/                 # Shared type re-exports
│   │   └── index.ts              # Re-exports AppType, schema types, VALID_TAGS from worker
│   └── api-client/               # Typed API client
│       └── src/
│           └── index.ts          # createApiClient(baseUrl, token) using hono/client
│
├── sst.config.ts                  # SST v3 infra — D1 (StashDb), R2 (Photos), Worker (Api)
├── .github/workflows/
│   ├── preview.yml                # PR preview: deploy → migrate → seed → E2E
│   ├── deploy.yml                 # Production deploy on merge to main
│   └── teardown.yml               # Cleanup preview stages on PR close
└── package.json                   # Root — workspaces, scripts, engines: node>=22
```

### Infrastructure (sst.config.ts)

- **D1 database** (`StashDb`) — SQLite at the edge, linked to worker
- **R2 bucket** (`Photos`) — spot photo storage, linked to worker
- **Worker** (`Api`) — Hono app with D1 + R2 bindings + Clerk env vars
- Outputs: `api` (worker URL), `dbId` (D1 database UUID)

### API Routes (`/api/v1/*`, all authenticated via Clerk JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/spots` | List visible spots (respects visibility + group membership) |
| GET | `/spots/:id` | Get spot detail with access check |
| POST | `/spots` | Create spot (with optional tags) |
| PATCH | `/spots/:id` | Update spot (owner only) |
| DELETE | `/spots/:id` | Delete spot (owner only) |
| POST | `/spots/:id/groups` | Share spot to a group |
| DELETE | `/spots/:id/groups/:groupId` | Unshare spot from group |
| GET | `/groups` | List user's groups |
| POST | `/groups` | Create group (generates SK8-XXXXXX invite code) |
| POST | `/groups/join` | Join group via invite code |
| GET | `/groups/:id/members` | List group members |
| DELETE | `/groups/:id/members/:userId` | Remove member (owner only) |
| GET | `/users/me` | Get or auto-create user record |
| PATCH | `/users/me` | Update username / avatar |

### Database Schema (D1)

Six tables: `users`, `spots`, `groups`, `group_members`, `spot_groups`, `spot_tags`.
Visibility is enforced at query level — see `getVisibleSpotsQuery()` and `getSpotByIdQuery()` in `schema.ts`.
Tags are normalized in `spot_tags` (not comma-separated). Valid tags: `ledge`, `rail`, `gap`, `stairs`, `manual_pad`, `transition`, `other`.

## Development

- `sst dev` — local development (starts worker + bindings)
- `npm run test:unit` — worker unit tests (vitest + @cloudflare/vitest-pool-workers)
- `npm run test:e2e` — Playwright API tests
- `npm run test:mobile` — Maestro mobile E2E flows
- `npm run typecheck` — TypeScript check across all workspaces
- Never deploy to preview or production — leave that to CI/humans

## CI/CD

- **preview.yml** — On PR: SST deploy to preview stage → apply D1 migrations via REST API → seed test data → run E2E tests → comment results on PR
- **deploy.yml** — On merge to main: SST deploy to production
- **teardown.yml** — On PR close: SST remove preview stage

D1 migrations are applied via the Cloudflare REST API (`/client/v4/accounts/.../d1/database/.../query`) because SST's `migrations` arg doesn't apply them at the version we use.

## Key Rules

- Never trust client-supplied user IDs — always derive from verified Clerk JWT
- Enforce spot visibility (private/group/public) at the DB query level
- Use `nanoid` for spot and group IDs
- Spot tags are normalized in `spot_tags` table, not comma-separated
- Invite codes: 6-char alphanumeric uppercase, formatted as `SK8-XXXXXX`

## Keeping This File Current

This file is the source of truth for agents working on this codebase. **Update it whenever you make a structural change**, including but not limited to:

- Adding, removing, or renaming routes — update the API Routes table
- Adding or modifying DB tables/columns — update the Database Schema section and the directory tree if a new migration file is added
- Adding new workspaces, apps, or packages — update the Project Structure tree
- Adding new screens, components, or hooks to the mobile app — update the tree
- Changing infrastructure resources in `sst.config.ts` — update the Infrastructure section
- Adding or modifying CI/CD workflows — update the CI/CD section
- Changing dev commands or test runners — update the Development section
- Adding new key rules or conventions — add them to the relevant section

A quick grep for the thing you changed in this file will tell you if it's mentioned. If it is, update it. If you add something new that a future agent would need to know about, add it.
