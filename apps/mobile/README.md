# Stash Mobile

Expo SDK 54 (React Native 0.81) app with file-based routing via Expo Router v6, Clerk authentication, and MapView integration.

## Prerequisites

- Node.js >= 22
- npm (workspaces are configured at the monorepo root)
- [Expo Go](https://expo.dev/go) installed on your physical device, **or** iOS Simulator / Android Emulator
- A [Clerk](https://clerk.com) project with a publishable key

## Getting Started

### 1. Install dependencies

From the **monorepo root**:

```bash
npm install
```

This installs all workspace dependencies, including the internal `@stash/api-client` package.

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

- `EXPO_PUBLIC_API_URL` — URL of the Hono API worker. Defaults to `http://localhost:8787` for local development.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Your Clerk publishable key (starts with `pk_test_` for development).

### 3. Start the API worker

The mobile app needs the backend running. From the monorepo root:

```bash
npm run dev
```

This runs `sst dev`, which starts the Cloudflare Worker with D1 and R2 bindings on `http://localhost:8787`.

### 4. Start the Expo dev server

In a separate terminal, from the monorepo root:

```bash
npm run dev:mobile
```

Or from `apps/mobile` directly:

```bash
npx expo start
```

## Using Expo Go

[Expo Go](https://expo.dev/go) is the fastest way to run the app on a physical device without building a native binary.

1. Install Expo Go from the [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android).
2. Start the dev server with `npm run dev:mobile`.
3. Scan the QR code shown in the terminal with your device camera (iOS) or the Expo Go app (Android).

**Limitations:** Expo Go uses a pre-built runtime, so any dependency that requires a custom native module not included in the Expo SDK won't work. If you hit this, use a [development build](#development-builds) instead.

### Network access

When using Expo Go on a physical device, your phone must be on the same network as your dev machine. Update `EXPO_PUBLIC_API_URL` to use your machine's LAN IP instead of `localhost`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.x:8787
```

## Development Builds

For features that require custom native code or when Expo Go isn't sufficient, create a development build using [EAS Build](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
# iOS (requires Apple Developer account for device builds)
npm run build:dev --workspace=apps/mobile -- --platform ios

# Android
npm run build:dev --workspace=apps/mobile -- --platform android
```

Install the resulting build on your device or emulator, then connect to the dev server the same way as Expo Go.

## Running on Simulators / Emulators

```bash
# iOS Simulator (macOS only, requires Xcode)
npm run ios --workspace=apps/mobile

# Android Emulator (requires Android Studio)
npm run android --workspace=apps/mobile
```

## Type Checking

```bash
# Mobile workspace only
npm run typecheck --workspace=apps/mobile

# All workspaces from monorepo root
npm run typecheck
```

## Testing

### E2E Tests (Maestro)

Mobile E2E tests use [Maestro](https://maestro.mobile.dev/). From the monorepo root:

```bash
npm run test:mobile
```

This runs the Maestro flows defined in `.maestro/flows/`.

## Production Deployments

Production builds are created with [EAS Build](https://docs.expo.dev/build/introduction/) and submitted to the App Store / Google Play via [EAS Submit](https://docs.expo.dev/submit/introduction/).

### Build

```bash
# iOS
npm run build:production --workspace=apps/mobile -- --platform ios

# Android
npm run build:production --workspace=apps/mobile -- --platform android
```

### Submit

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

### CI/CD

Production deployments of the **API** are handled automatically — merges to `main` trigger the `deploy.yml` workflow. Mobile builds are triggered manually via EAS or can be integrated into CI with `eas build` commands.

## Project Structure

```
apps/mobile/
├── app/                   # Expo Router v6 file-based routing
│   ├── _layout.tsx        # Root layout — ClerkProvider + StatusBar
│   ├── index.tsx          # Entry redirect (onboarding → auth → tabs)
│   ├── onboarding.tsx     # First-launch onboarding carousel
│   ├── (auth)/            # Sign-in / sign-up screens
│   ├── (tabs)/            # Bottom tab navigator (map, feed, profile)
│   └── spot/              # Spot detail and add screens
├── components/            # Shared UI components
├── hooks/                 # Custom hooks (useSpots, useGroups)
├── lib/
│   ├── api.ts             # API client (uses @stash/api-client)
│   ├── clerk.ts           # Clerk token cache via expo-secure-store
│   └── theme.ts           # Colors, fonts, spacing constants
├── assets/                # App icon, splash screen
├── app.json               # Expo configuration
└── .env.example           # Environment variable template
```
