# Stash — Development Guide

Monorepo with an Expo mobile app (`apps/mobile`), Cloudflare Worker API (`workers/api`), and shared packages (`packages/*`).

## Prerequisites

- Node.js >= 22
- npm (workspaces are configured at the monorepo root)
- [SST v3](https://sst.dev/) for infrastructure and local development
- A [Clerk](https://clerk.com) project with publishable + secret keys
- [Expo Go](https://expo.dev/go) on a physical device, **or** iOS Simulator / Android Emulator (for mobile development)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

This installs all workspace dependencies, including the internal `@stash/api-client` package.

### 2. Start local development

```bash
npm run dev
```

This runs `sst dev`, which deploys the Cloudflare Worker (with D1 and R2 bindings) to a dev stage on Cloudflare. The worker URL is printed in the terminal and saved to `.sst/outputs.json`.

### 3. Set the mobile API URL

Copy the worker URL from the `sst dev` output and set it in `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://<your-sst-dev-worker-url>.workers.dev
```

You can also read it from `.sst/outputs.json` after `sst dev` has started:

```bash
cat .sst/outputs.json | grep api
```

### 4. Start the Expo dev server

In a separate terminal:

```bash
npm run dev:mobile
```

Or from `apps/mobile` directly:

```bash
npx expo start
```

> **Note:** If you change `EXPO_PUBLIC_API_URL`, restart the Expo dev server — `EXPO_PUBLIC_*` vars are baked in at bundle time.

## API Worker

### Environment variables

The Cloudflare Worker uses a `.dev.vars` file for local secrets (this file is gitignored). Copy the example and fill in your Clerk secret key:

```bash
cp workers/api/.dev.vars.example workers/api/.dev.vars
```

Edit `workers/api/.dev.vars` with your values:

```
CLERK_SECRET_KEY=sk_test_...
```

- `CLERK_SECRET_KEY` — Your Clerk **secret** key (starts with `sk_test_` for development). Found in the Clerk dashboard under **API Keys**. The worker uses this to verify JWT tokens in the auth middleware.

> **How it works:** Wrangler (and `sst dev`) automatically loads `workers/api/.dev.vars` and injects the values as environment bindings at runtime. Non-secret vars like `CLERK_PUBLISHABLE_KEY` are defined in `workers/api/wrangler.toml` under `[vars]` and don't need to go in `.dev.vars`.

## Mobile App

### Environment variables

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/mobile/.env` with your values:

```
EXPO_PUBLIC_API_URL=https://<your-sst-dev-worker-url>.workers.dev
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

- `EXPO_PUBLIC_API_URL` — URL of the Hono API worker. Get this from `sst dev` output or `.sst/outputs.json`.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Your Clerk publishable key (starts with `pk_test_` for development).

### Using Expo Go

[Expo Go](https://expo.dev/go) is the fastest way to run the app on a physical device without building a native binary.

1. Install Expo Go from the [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android).
2. Start the dev server with `npm run dev:mobile`.
3. Scan the QR code shown in the terminal with your device camera (iOS) or the Expo Go app (Android).

**Limitations:** Expo Go uses a pre-built runtime, so any dependency that requires a custom native module not included in the Expo SDK won't work. If you hit this, use a [development build](#development-builds) instead.

#### Network access

Since `sst dev` deploys the API to Cloudflare (not localhost), the worker URL is accessible from any device with internet access — no LAN IP configuration needed.

### Development Builds

For features that require custom native code or when Expo Go isn't sufficient, create a development build using [EAS Build](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
# iOS (requires Apple Developer account for device builds)
npm run build:dev --workspace=apps/mobile -- --platform ios

# Android
npm run build:dev --workspace=apps/mobile -- --platform android
```

Install the resulting build on your device or emulator, then connect to the dev server the same way as Expo Go.

### Running on Simulators / Emulators

```bash
# iOS Simulator (macOS only, requires Xcode)
npm run ios --workspace=apps/mobile

# Android Emulator (requires Android Studio)
npm run android --workspace=apps/mobile
```

## Type Checking

```bash
# All workspaces
npm run typecheck

# Mobile workspace only
npm run typecheck --workspace=apps/mobile
```

## Testing

### Unit Tests (Vitest)

API worker unit tests use Vitest with `@cloudflare/vitest-pool-workers`:

```bash
npm run test:unit
```

### API E2E Tests (Playwright)

```bash
npm run test:e2e
```

### Mobile E2E Tests (Maestro)

```bash
npm run test:mobile
```

This runs the Maestro flows defined in `.maestro/flows/`.

## Production

### Mobile Builds

Production builds are created with [EAS Build](https://docs.expo.dev/build/introduction/) and submitted to the App Store / Google Play via [EAS Submit](https://docs.expo.dev/submit/introduction/).

```bash
# iOS
npm run build:production --workspace=apps/mobile -- --platform ios

# Android
npm run build:production --workspace=apps/mobile -- --platform android
```

### Mobile Submission

After a successful production build, submit to the stores:

```bash
# iOS — submits to App Store Connect (requires ASC API key)
eas submit --platform ios

# Android — submits to Google Play Console (requires service account key)
eas submit --platform android
```

### Preview Builds

For internal testing and TestFlight / internal track distribution:

```bash
npm run build:preview --workspace=apps/mobile -- --platform ios
npm run build:preview --workspace=apps/mobile -- --platform android
```

### API Deployments

Production deployments of the API are handled automatically — merges to `main` trigger the `deploy.yml` workflow. PR previews are deployed via the `preview.yml` workflow.
