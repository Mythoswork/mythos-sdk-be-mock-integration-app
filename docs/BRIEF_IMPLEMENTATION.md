# Mythos Calculator Mockup — Implementation Brief

Mockup Next.js app (Pages Router) exercising the full Mythos producer lifecycle: launch, handshake, consume, meter. Consumes `@mythos-work/sdk` (`fix/sdk-issuer-and-charge-id` branch) as a local dependency.

## What's in here

- **Harness** (`pages/index.tsx`) — plays the Mythos-platform side: login, launch, wallet before/after, launch history. Not part of the SDK contract, just a driver.
- **Producer app** (`pages/calculator.tsx`) — plays the third-party app side: verifies the launch token once, then runs metered calculator operations.
- **`pages/api/well-known/mythos-handshake.ts`** — wired to `handshakeRoute()`, reachable at `/.well-known/mythos-handshake` via a `next.config.ts` rewrite.
- **`pages/api/verify-session.ts`** — the *only* call to `requireLaunchToken()` (single-use consume).
- **`pages/api/calculate.ts`** — per-operation, uses non-consuming `verifyLaunchToken()` + `reportUsage()`.
- **`pages/api/harness/*`** — server-side proxies to mythos-backend (login/wallet/launch/launch-history), needed because `localhost:3001` isn't in the backend's `CORS_ORIGIN` whitelist.
- **`scripts/bootstrap.ts`** — one-time setup: logs in, creates the listing, writes `MYTHOS_LISTING_ID` to `.env.local`.

## Prerequisites

- `mythos-backend` running locally on port 5001 (`PORT=5001` in its `.env`).
- `mythos-sdk` checked out at `../mythos-sdk` on `fix/sdk-issuer-and-charge-id`, built (`cd packages/node && npm install && npm run build`), then packed:
  ```
  cd ../mythos-sdk/packages/node && npm pack
  ```
  This app depends on the resulting tarball (`file:../mythos-sdk/packages/node/mythos-sdk-0.1.0.tgz`), **not** the directory — Turbopack can't resolve `file:` deps symlinked outside the project root, only tarball-form installs (which npm copies instead of symlinking).

## First-time setup

```
npm install
cp .env.example .env.local   # already done if .env.local exists; fill in values
npm run dev -- -p 3001       # start once so bootstrap can reach the handshake route
npm run bootstrap            # logs in, creates the listing, writes MYTHOS_LISTING_ID
# kill the dev server, then restart it to pick up the new env var:
npm run dev -- -p 3001
```

## Running the flow

1. Open `http://localhost:3001`.
2. Login (defaults to the seeded `carol@example.com` / `Test@1234`).
3. Click **Launch Calculator** — mints a launch token, opens `/calculator?lt=...`.
4. The calculator page verifies the session once (consumes it), then runs operations — each one calls `/api/calculate`, which meters 1 credit via `reportUsage()`.
5. Reloading the calculator with the same `lt` after the first load correctly fails with `401 Token already consumed` — that's the SDK's single-use guarantee, not a bug.
6. Wallet balance in the harness reflects each charge exactly; draining it to 0 makes the next calculate call return a clean `402 Insufficient funds`.

## Known workarounds baked into this mockup

- **No live handshake reachability**: `launch_url` must be a real HTTPS URL with a valid-looking TLD (backend validation rejects `localhost`), and the actual handshake fetch does real TLS verification with no localhost exception. `scripts/bootstrap.ts` creates the listing directly with `status: 'published'` (bypasses the handshake-triggering `/api/listings/status` endpoint entirely) using a placeholder `launch_url`. Handshake itself is verified separately by curling `/.well-known/mythos-handshake` directly — it works, it's just not wired into the live publish flow here.
- **Admin role on carol**: the direct-publish path above doesn't actually require admin, but if you ever switch to the `/api/listings/status` + `skipHandshake:true` path, you'll need an admin user — no seeded user has `role_preference='admin'`, it was set manually on carol in the local dev DB (reversible: `UPDATE public.users SET role_preference='both' WHERE email='carol@example.com'`).
