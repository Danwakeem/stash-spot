# Stash — Project Milestones

## Milestone 1: Clean Up Mobile App Internals

Low-hanging fruit — wire up code that already exists but isn't connected.

- [ ] Use `SpotCard` component in `feed.tsx` (currently has duplicated inline card rendering)
- [ ] Use `useSpots` / `useGroups` hooks in screens (all screens do inline `fetch` instead)
- [ ] Use the typed API client (`@stash/api-client`) instead of raw `fetch` calls
- [ ] Consolidate `API_URL` usage — duplicated across `map.tsx`, `feed.tsx`, `spot/[id].tsx` instead of importing from `lib/api.ts`

## Milestone 2: Group Management UI (Mobile)

All API routes exist but there is zero mobile UI for groups.

- [ ] Create Group screen — name input, generates invite code
- [ ] Join Group screen — enter `SK8-XXXXXX` invite code
- [ ] Group detail / members screen — list members, owner can remove
- [ ] Share spot to group — UI in spot detail or add-spot flow
- [ ] Wire up "MY CREWS" button on profile (currently a dead button)

## Milestone 3: Spot Editing & Profile

- [ ] Spot edit screen — `PATCH /spots/:id` is implemented but no UI exists
- [ ] Wire up "MY SPOTS" button on profile (currently dead)
- [ ] My Spots list screen — filtered view of user's own spots
- [ ] Profile editing — update username / avatar via `PATCH /users/me`

## Milestone 4: Photo Upload

R2 bucket (`Photos`) is provisioned in infra but completely unused.

- [ ] API routes for photo upload / retrieval (`POST /spots/:id/photos`, `GET` for serving)
- [ ] Mobile camera / gallery picker — attach photos when creating or editing spots
- [ ] Photo display — show photos in spot detail and feed cards

## Milestone 5: Spot Presence (Live Viewers)

`SpotPresence` Durable Object is fully implemented but not wired to anything.

- [ ] API routes for presence — join / leave / get viewer count via the DO
- [ ] Mobile UI — show live viewer count on spot detail screen
- [ ] WebSocket or polling for real-time updates

## Milestone 6: Fix E2E & CI Testing

- [ ] Fix Playwright E2E tokens — `getTestClerkToken()` in `e2e/spots.spec.ts` returns fake strings; needs real Clerk Backend API token generation
- [ ] Add E2E test step to `preview.yml` — currently deploys + seeds but never runs tests
- [ ] Fix Maestro flows — UI selectors are mismatched (e.g., taps "Add Spot" text but actual UI is a `+` FAB)
- [ ] Wire Maestro into CI — no workflow runs mobile E2E
- [ ] Add unit tests for groups and users routes — only `spots.test.ts` exists today
- [ ] Add production migration step to `deploy.yml` — currently does not apply D1 migrations

## Milestone 7: Map & UX Polish

- [ ] Fix map markers — spots are not being created or displayed on the map
- [ ] Replace tab bar icons with Iconify icons
- [ ] Add skeleton loaders for feed, spot detail, and other async screens
- [ ] Remove lat/long fields from the Add Spot view (use device location or map pin instead)
- [ ] Support light and dark mode (extend `lib/theme.ts` with color schemes, respect system preference)

## Milestone 8: Documentation & Cleanup

- [ ] Fix CLAUDE.md project tree — shows `spot/add.tsx` but actual file is `app/add-spot.tsx`
- [ ] Remove or integrate unused code (covered by Milestone 1)
