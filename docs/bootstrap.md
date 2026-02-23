# Stash — Claude Code Bootstrap

## Project Overview

**Stash** is a mobile app for tracking and sharing skate spots. Built with Expo (React Native) on the frontend and Cloudflare Workers + Hono on the backend. Users can log spots as private, share them with invite-only crews (groups), or make them public for the community.

The name is a double meaning — stashing your secret spots away, and the disguise/mustache motif in the branding (a skater keeping spots on the down-low).

## Branding & Logo

The Stash logo is a skate-culture spin on the classic disguise gag — glasses, bushy mustache, and beanie, rendered as a bold flat graphic. Think Groucho Marx meets a skate deck sticker.

**Logo concept:**

- A face wearing the classic novelty disguise (thick-rimmed glasses + oversized mustache)
- Beanie pulled low — the "incognito skater"
- Thick, hand-drawn outlines — sticker aesthetic, would look good screened on a deck or tee
- Color palette pulls from the design system: near-black outline, red or yellow fill, off-white background
- The wordmark "STASH" sits below in a condensed bold font (Bebas Neue), optionally with a small "your spots." tagline underneath in a lighter weight

**Logo usage:**

- App icon: just the disguise face, no wordmark, on a dark background
- Splash screen: full logo centered on aged paper (#F5F0E8) background
- Tab bar / nav header: wordmark only
- Sticker mode: full face + wordmark lockup with white outline on transparent — designed to look good on a skateboard, helmet, or laptop

## Tech Stack

| Layer               | Technology                                                |
| ------------------- | --------------------------------------------------------- |
| Mobile              | Expo (React Native), EAS Build, EAS Update                |
| Auth                | Clerk (React Native SDK)                                  |
| Backend             | Cloudflare Workers, Hono                                  |
| Database            | Cloudflare D1 (SQLite)                                    |
| Realtime / Presence | Cloudflare Durable Objects                                |
| Storage (photos)    | Cloudflare R2                                             |
| IaC                 | SST v3 (TypeScript)                                      |
| Testing             | Vitest (unit), Playwright (E2E API), Maestro (mobile E2E) |

## Monorepo Structure

```
/
├── apps/
│   └── mobile/               # Expo app
│       ├── app/              # Expo Router screens
│       │   ├── (auth)/       # Sign in / sign up
│       │   ├── (tabs)/       # Main tab navigator
│       │   │   ├── map.tsx   # Map view of spots
│       │   │   ├── feed.tsx  # Public/group feed
│       │   │   └── profile.tsx
│       │   └── spot/
│       │       ├── [id].tsx  # Spot detail
│       │       └── add.tsx   # Quick add spot
│       ├── components/
│       ├── hooks/
│       └── lib/              # API client, utils
├── packages/
│   └── api-client/           # Shared typed API client (hono/client)
└── workers/
    └── api/                  # Hono worker
        ├── src/
        │   ├── index.ts      # Worker entrypoint
        │   ├── routes/
        │   │   ├── spots.ts
        │   │   ├── groups.ts
        │   │   └── users.ts
        │   ├── middleware/
        │   │   └── auth.ts   # Clerk JWT verification
        │   ├── db/
        │   │   ├── schema.ts # D1 schema + queries
        │   │   └── migrations/
        │   └── durable-objects/
        │       └── SpotPresence.ts
        ├── wrangler.toml
        └── vitest.config.ts
```

## Database Schema

Run all migrations via `wrangler d1 migrations apply stash-db`.

```sql
-- migrations/0001_initial.sql

CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- Clerk user ID
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE spots (
  id TEXT PRIMARY KEY,          -- nanoid
  name TEXT NOT NULL,
  description TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'group', 'public')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,          -- nanoid
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE spot_groups (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, group_id)
);

CREATE TABLE spot_tags (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (tag IN ('ledge', 'rail', 'gap', 'stairs', 'manual_pad', 'transition', 'other')),
  PRIMARY KEY (spot_id, tag)
);

-- Indexes
CREATE INDEX idx_spots_created_by ON spots(created_by);
CREATE INDEX idx_spots_visibility ON spots(visibility);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_spot_groups_group ON spot_groups(group_id);
CREATE INDEX idx_spot_tags_tag ON spot_tags(tag);
```

## API Routes (Hono)

All routes are prefixed with `/api/v1`. Auth middleware verifies the Clerk JWT on every protected route.

### Spots

- `GET /spots` — list spots visible to the authenticated user (public + groups they belong to + their own private). Supports `?tag=ledge` filter.
- `GET /spots/:id` — get a single spot (with access check), includes tags array
- `POST /spots` — create a spot, accepts `tags: string[]`
- `PATCH /spots/:id` — update a spot (owner only), replaces tags array
- `DELETE /spots/:id` — delete a spot (owner only)

### Groups

- `GET /groups` — list groups the user belongs to
- `POST /groups` — create a group
- `POST /groups/join` — join via invite code `{ invite_code }`
- `GET /groups/:id/members` — list members
- `DELETE /groups/:id/members/:userId` — remove member (owner only)

### Spot <-> Group

- `POST /spots/:id/groups` — share a spot to a group `{ group_id }`
- `DELETE /spots/:id/groups/:groupId` — unshare

### Users

- `GET /users/me` — get or create user record after Clerk sign-in
- `PATCH /users/me` — update username/avatar

## Auth Middleware

Verify Clerk JWTs in the Hono worker using Clerk's JWKS endpoint. Do not trust client-supplied user IDs — always derive `userId` from the verified token.

```typescript
// workers/api/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'

export const clerkAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await verifyToken(token, {
    secretKey: c.env.CLERK_SECRET_KEY,
  })

  c.set('userId', payload.sub)
  await next()
})
```

## Visibility Access Control

Enforce this logic at the DB query level, not in application code:

- `private` spots: only visible to `created_by`
- `group` spots: visible to anyone who is a member of any group in `spot_groups`
- `public` spots: visible to everyone (including unauthenticated users)

Never expose private or group spots in any public feed or activity stream. No "Dan added a spot in Brooklyn" leakage.

## Durable Objects

Use a `SpotPresence` Durable Object to track who is currently viewing a spot in real time (useful for group collaboration — "2 others are here"). Keep it simple:

```typescript
export class SpotPresence implements DurableObject {
  private viewers: Set<string> = new Set()

  async fetch(request: Request) {
    const { userId, action } = await request.json()
    if (action === 'join') this.viewers.add(userId)
    if (action === 'leave') this.viewers.delete(userId)
    return Response.json({ count: this.viewers.size })
  }
}
```

Wire it up optionally — it's not core to MVP but scaffolding it now avoids a rewrite later.

## Mobile App

### Key Screens

**Quick Add (lock screen widget deep link target)**

- Opens directly to this screen via `expo-linking`
- GPS is pre-populated via `expo-location`
- Fields: name (required), visibility selector, optional description
- Submits and closes in under 5 seconds

**Map View**

- Uses `react-native-maps`
- Shows all visible spots as pins
- Color-coded by visibility: gray = private, blue = group, orange = public
- Tap pin -> spot detail sheet

**Spot Detail**

- Name, description, map thumbnail, created by, date
- Share to group button (if visibility allows)
- Edit/delete (owner only)

### Lock Screen Widget (iOS 16+)

Use `expo-widgets` or a custom native module. The widget is a single button that deep links to `skatespots://spot/add`. Keep it minimal — the app handles the rest.

### Design System — Retro Skeuomorphic

The app should feel like worn skate hardware — sticker-bombed, tactile, analog. Apply these principles consistently:

**Colors**

```
Background:    #F5F0E8  (aged paper / grip tape beige)
Primary:       #E84B1E  (faded red — Independent trucks)
Secondary:     #2B4D8C  (faded denim blue)
Accent:        #F2C94C  (yellow warning tape)
Dark:          #1A1A1A  (almost black — blackout grip)
Text:          #2C2C2C
Muted text:    #8C7B6B
```

**Typography**

- Headings: `Bebas Neue` or `Anton` (bold, condensed, sticker-like)
- Body: `Space Mono` or `Courier Prime` (typewriter feel)
- Labels: `Permanent Marker` sparingly for handwritten accents

**Component Style**

- Buttons: thick borders (2-3px), slight drop shadow offset (not blurred), pressed state should feel physically depressed (`scale(0.97)`, darker bg)
- Cards: off-white background, subtle grain texture overlay, torn-edge or tape-corner accents via SVG
- Inputs: look like filled-in paper forms — lined background, pencil-gray text
- Navigation: tab bar should look like the bottom of a skateboard deck — wood grain texture, sticker overlays
- Map pins: custom SVG shaped like a skate truck bolt

**Avoid**

- Flat/minimal design, gradients, rounded pill buttons, glassmorphism, system default components unstyled

## CI/CD — GitHub Actions

### PR Preview (`/.github/workflows/preview.yml`)

Triggers on every pull request. Deploys a named preview environment to Cloudflare using the PR number as the stage, seeds the D1 database, and posts the API URL as a PR comment.

```yaml
name: Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: dev
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Deploy preview
        id: deploy
        run: npx sst deploy --stage pr-${{ github.event.number }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_DEFAULT_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}

      - name: Run migrations
        run: npx wrangler d1 migrations apply stash-db --env pr-${{ github.event.number }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Seed database
        run: npx tsx workers/api/src/db/seed.ts
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          D1_DATABASE_ID: ${{ steps.deploy.outputs.d1_database_id }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          SEED_ENV: preview

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview deployed: ${{ steps.deploy.outputs.api_url }}`
            })
```

### Production Deploy (`/.github/workflows/deploy.yml`)

Triggers on push to `main`. Runs migrations but does NOT seed — production data is real.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Deploy production
        run: npx sst deploy --stage production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_DEFAULT_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}

      - name: Run migrations
        run: npx wrangler d1 migrations apply stash-db --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### PR Teardown (`/.github/workflows/teardown.yml`)

Triggers when a PR is closed (merged or dismissed). Removes the preview Cloudflare resources and deletes the Clerk test users to keep the dev instance clean.

```yaml
name: Teardown Preview

on:
  pull_request:
    types: [closed]

jobs:
  teardown:
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Teardown Clerk test users
        run: npx tsx workers/api/src/db/teardown.ts
        env:
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          STAGE: pr-${{ github.event.number }}

      - name: Teardown SST preview
        run: npx sst remove --stage pr-${{ github.event.number }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_DEFAULT_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
```

### Teardown Script (`workers/api/src/db/teardown.ts`)

Deletes the Clerk test users created by the seed. Since D1 is destroyed by `sst remove`, only Clerk cleanup needs to happen explicitly.

```typescript
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

const SEED_EXTERNAL_IDS = ['seed_alice', 'seed_bob']

async function deleteClerkTestUsers() {
  for (const externalId of SEED_EXTERNAL_IDS) {
    const existing = await clerk.users.getUserList({ externalId: [externalId] })
    for (const user of existing.data) {
      await clerk.users.deleteUser(user.id)
      console.log(`Deleted Clerk user ${user.id} (${externalId})`)
    }
  }
}

await deleteClerkTestUsers()
console.log('Teardown complete')
```

Note: Clerk user deletion is safe to run even if the users don't exist — the script checks before deleting. D1, R2, and the Worker are all torn down by `sst remove` so no explicit DB cleanup is needed.

Secrets are scoped using [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment). Create two environments in your repo settings: `dev` and `prod`.

Each environment needs these secrets:

```
CLOUDFLARE_API_TOKEN          # Cloudflare API token with Workers/D1/R2 permissions
CLOUDFLARE_ACCOUNT_ID         # Cloudflare account ID
CLERK_SECRET_KEY              # Clerk secret key (dev or prod depending on environment)
CLERK_PUBLISHABLE_KEY         # Clerk publishable key (dev or prod depending on environment)
```

Use separate Clerk applications for each environment. In the Clerk dashboard, create two applications — one for `dev` (all PRs share it) and one for `prod`.

## Database Seeding

### The Clerk ID Problem

The `users` table uses Clerk user IDs (`user_abc123`) as primary keys. Seeds cannot use made-up IDs — they must be real Clerk-issued IDs. The seed script solves this by calling the Clerk Backend API to upsert test users first, then using their real IDs to seed D1.

### Seed Script (`workers/api/src/db/seed.ts`)

```typescript
import { createClerkClient } from '@clerk/backend'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

const TEST_USERS = [
  {
    externalId: 'seed_alice',
    username: 'alice_sk8s',
    email: 'alice@skatetest.dev',
    password: 'TestPassword123!',
  },
  {
    externalId: 'seed_bob',
    username: 'bob_grinds',
    email: 'bob@skatetest.dev',
    password: 'TestPassword123!',
  },
]

async function upsertClerkUsers() {
  const users = []
  for (const u of TEST_USERS) {
    // Check if user already exists by external ID to make seed idempotent
    const existing = await clerk.users.getUserList({ externalId: [u.externalId] })
    if (existing.totalCount > 0) {
      users.push(existing.data[0])
      continue
    }
    const created = await clerk.users.createUser({
      externalId: u.externalId,
      username: u.username,
      emailAddress: [u.email],
      password: u.password,
    })
    users.push(created)
  }
  return users
}

async function seedD1(clerkUsers: { id: string; username: string }[]) {
  const [alice, bob] = clerkUsers

  // Use the D1 REST API to seed in CI, or wrangler binding in local
  // See: https://developers.cloudflare.com/d1/platform/client-api/
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`

  const sql = `
    INSERT OR IGNORE INTO users (id, username) VALUES ('${alice.id}', '${alice.username}');
    INSERT OR IGNORE INTO users (id, username) VALUES ('${bob.id}', '${bob.username}');

    INSERT OR IGNORE INTO spots (id, name, lat, lng, visibility, created_by)
    VALUES ('spot_001', 'EMB', 37.7878, -122.4, 'public', '${alice.id}');

    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_001', 'ledge');
    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_001', 'stairs');

    INSERT OR IGNORE INTO spots (id, name, lat, lng, visibility, created_by)
    VALUES ('spot_002', 'Secret Hubba', 37.791, -122.403, 'private', '${bob.id}');

    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_002', 'ledge');

    INSERT OR IGNORE INTO groups (id, name, invite_code, created_by)
    VALUES ('grp_001', 'SF Crew', 'SK8-SF1', '${alice.id}');

    INSERT OR IGNORE INTO group_members (group_id, user_id, role)
    VALUES ('grp_001', '${alice.id}', 'owner');

    INSERT OR IGNORE INTO group_members (group_id, user_id, role)
    VALUES ('grp_001', '${bob.id}', 'member');
  `

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (!res.ok) throw new Error(`D1 seed failed: ${await res.text()}`)
}

const clerkUsers = await upsertClerkUsers()
await seedD1(clerkUsers)
console.log('Seed complete')
console.log('Test credentials:')
TEST_USERS.forEach(u => console.log(`  ${u.username}: ${u.email} / ${u.password}`))
```

### Local Seeding

For local development, run the seed against the local D1 instance:

```bash
# Start local worker first
sst dev &

# Then seed (uses wrangler to target local D1)
CLERK_SECRET_KEY=sk_test_... npx tsx workers/api/src/db/seed.ts --local
```

The seed script should detect `--local` and use `wrangler d1 execute` instead of the REST API.

### Seed Design Principles

- **Idempotent** — safe to run multiple times, uses `INSERT OR IGNORE` and checks for existing Clerk users by `externalId`
- **Deterministic IDs** — use fixed IDs (`spot_001`, `grp_001`) so tests can reference them reliably
- **Minimal but complete** — covers all visibility types, group membership, and tag combinations so every code path has data to work with
- **Never run in production** — the CI workflow only seeds on preview stages, not on `main`
- **Local** (`sst dev`): default for all agentic work. Claude Code should always verify changes here before considering a task complete. Spins up a local Workers runtime with real D1 (local SQLite), R2 (local filesystem), and live reload.
- **Preview** (`sst deploy --stage pr-{number}`): triggered manually by a human or CI on pull request. Provides a real Cloudflare deployment for integration checks. Not expected to be used by Claude Code autonomously.
- **Production** (`sst deploy --stage production`): human only, never triggered by Claude Code.

When running tests locally, Claude Code should:

1. Start the worker with `sst dev` (or verify it's already running)
1. Run unit tests with `vitest`
1. Run API E2E tests with `playwright` pointed at `localhost`
1. Run Maestro mobile flows against the Expo dev build on simulator

Claude Code should never attempt to deploy to preview or production to verify its work. If something can only be verified in a deployed environment, leave a clear note in the PR description explaining what needs human verification and why.

## Testing Strategy

### Unit Tests (Vitest — Workers)

Test route handlers and DB query logic in isolation using Cloudflare's `@cloudflare/vitest-pool-workers`.

```typescript
// workers/api/src/routes/spots.test.ts
import { describe, it, expect } from 'vitest'
import { createTestApp } from '../test-utils'

describe('GET /spots', () => {
  it('should not return private spots from other users', async () => {
    const app = createTestApp({ userId: 'user_abc' })
    const res = await app.request('/api/v1/spots')
    const body = await res.json()
    expect(body.spots.every(s => s.visibility !== 'private' || s.created_by === 'user_abc')).toBe(true)
  })
})
```

### E2E API Tests (Playwright + API testing)

Test the full worker stack against a local `wrangler dev` instance or a staging environment.

```typescript
// e2e/spots.spec.ts
import { test, expect } from '@playwright/test'

test('create and retrieve a private spot', async ({ request }) => {
  const token = await getTestClerkToken('user_a')

  const create = await request.post('/api/v1/spots', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'EMB', lat: 37.788, lng: -122.400, visibility: 'private' }
  })
  expect(create.ok()).toBeTruthy()
  const { id } = await create.json()

  // user_b should NOT be able to see it
  const tokenB = await getTestClerkToken('user_b')
  const list = await request.get('/api/v1/spots', {
    headers: { Authorization: `Bearer ${tokenB}` }
  })
  const body = await list.json()
  expect(body.spots.find(s => s.id === id)).toBeUndefined()
})
```

### Mobile E2E (Maestro)

Maestro runs YAML-based flows against a real device or simulator. Create flows for critical paths:

```yaml
# .maestro/flows/add_spot.yaml
appId: com.yourname.skatespots
---
- launchApp
- tapOn: "Add Spot"
- assertVisible: "Current Location"
- tapOn:
    id: "spot-name-input"
- inputText: "Test Ledge"
- tapOn: "Private"
- tapOn: "Save Spot"
- assertVisible: "Test Ledge"
```

Run with: `maestro test .maestro/flows/`

### Test Utilities

Create a `test-utils.ts` in the worker that:

- Seeds a local D1 with fixture data
- Generates mock Clerk JWTs signed with a test secret
- Provides a `createTestApp()` helper that wires up all middleware with test env vars

## Environment Variables

### SST (`sst.config.ts`)

SST v3 manages Workers, D1, and R2. Durable Objects must be deployed separately via `wrangler` due to a gap in the Cloudflare Terraform provider that SST builds on — see the note below.

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "stash",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const db = new sst.cloudflare.D1("Stash", {
      migrations: "workers/api/src/db/migrations",
    });

    const photos = new sst.cloudflare.Bucket("Photos");

    const api = new sst.cloudflare.Worker("Api", {
      url: true,
      handler: "workers/api/src/index.ts",
      link: [db, photos],
      environment: {
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
      },
    });

    return {
      api: api.url,
    };
  },
});
```

**Durable Objects caveat:** SST does not yet support Durable Object bindings because the underlying Cloudflare Terraform provider doesn't support them. Deploy the DO class via a separate `wrangler.toml` scoped only to the DO, and reference the Worker by service binding name. This is a known gap and may be resolved in future SST/Cloudflare provider versions.

```toml
# workers/api/wrangler.do.toml — only used for DO deployment
name = "stash-presence"
main = "src/durable-objects/SpotPresence.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [{ name = "SPOT_PRESENCE", class_name = "SpotPresence" }]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SpotPresence"]
```

Deploy with: `wrangler deploy --config wrangler.do.toml`

### Worker secrets

```bash
wrangler secret put CLERK_SECRET_KEY
```

### Mobile (`.env`)

```
EXPO_PUBLIC_API_URL=https://stash-api.your-subdomain.workers.dev
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

## Getting Started — Bootstrap Order

Claude Code should implement in this order to keep things unblocked:

1. **Monorepo scaffold** — set up workspaces, tsconfig, shared eslint
2. **D1 migrations** — create and apply schema
3. **Hono worker skeleton** — index.ts, wrangler.toml, hello world route
4. **Auth middleware** — Clerk JWT verification
5. **Spots CRUD routes** — with visibility access control
6. **Groups routes** — create, join via invite code, membership
7. **Spot <-> Group routes** — share/unshare
8. **Unit tests** — cover access control logic thoroughly
9. **Expo app scaffold** — Expo Router, Clerk provider, tab navigator
10. **API client package** — typed Hono client shared between mobile and tests
11. **Core screens** — quick add, map, spot detail
12. **Design system** — retro skeuomorphic theme, custom components
13. **Lock screen widget** — iOS deep link target
14. **Maestro flows** — happy path E2E for add spot, join group, share spot
15. **Playwright E2E** — API-level access control scenarios
16. **SST IaC** — codify D1, R2, Worker via `sst.config.ts`; deploy DO binding separately via `wrangler`

## Key Constraints & Decisions

- **Spot tags are stored normalized** in `spot_tags` — not as a comma-separated column. Valid values: `ledge`, `rail`, `gap`, `stairs`, `manual_pad`, `transition`, `other`. The option maps to `other` in the DB.
- **Never trust client-supplied user IDs** — always read from verified Clerk JWT
- **No activity feeds that leak spot locations** — visibility must be enforced at query time
- **Geolocation is always requested at the time of add** — do not cache stale locations
- **Invite codes should be short and readable** — 6 char alphanumeric, uppercase (e.g. `SK8-A3F`)
- **Photos are optional** — don't block spot creation on photo upload; upload async to R2 after save
- **Offline-first for quick add** — queue the spot locally if no connection and sync when back online (use `expo-sqlite` as local queue)
- **D1 is eventually consistent on reads after writes** — account for this in tests by using the primary DB binding, not read replicas
