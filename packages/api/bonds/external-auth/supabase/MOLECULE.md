# @molecule/api-external-auth-supabase

External authentication provider using Supabase — first-class support for
apps imported into molecule.dev that were built on Supabase (Lovable and
similar).

Implements the `@molecule/api-external-auth` contract: the exported
`provider` verifies a user's Supabase JWT server-side via the anon client's
`auth.getUser(token)`. Two tiers:

- **No-secret tier** (works out of the box): token verification and
  RLS-constrained PostgREST access via `getAnonClient()` — both using only
  the PUBLIC anon key (`SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` /
  `VITE_SUPABASE_PUBLISHABLE_KEY`). No secret required.
- **Connected tier**: once the user supplies `SUPABASE_SERVICE_ROLE_KEY`,
  `getServiceClient()` returns an admin client that bypasses Row Level
  Security. Gate every admin path with `hasServiceRole()`.

Settings come from `configureSupabase()` or, lazily at first client
creation, from env: `SUPABASE_URL` ?? `VITE_SUPABASE_URL`,
`SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
`VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
`resetSupabase()` clears cached clients + settings (test hook).

## Quick Start

```ts
// bonds.ts — wire the provider at startup:
import { setProvider } from '@molecule/api-external-auth'
import { provider } from '@molecule/api-external-auth-supabase'

setProvider(provider)

// Then server routes verify the token the frontend already sends:
import { verifyUserToken } from '@molecule/api-external-auth'

app.get('/api/me', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '') ?? ''
  const user = await verifyUserToken(token)
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired session.' })
    return
  }
  res.json({ userId: user.userId, email: user.email })
})
```

```ts
// Admin operations need the service-role key — ALWAYS gate on hasServiceRole():
import { getServiceClient, hasServiceRole } from '@molecule/api-external-auth-supabase'

if (hasServiceRole()) {
  const admin = getServiceClient()
  await admin.from('profiles').update({ suspended: true }).eq('id', targetId)
} else {
  // Degrade: store the flag in the provisioned DATABASE_URL Postgres,
  // or ask the user to connect SUPABASE_SERVICE_ROLE_KEY in the
  // Environment panel.
}
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-external-auth-supabase @molecule/api-external-auth @supabase/supabase-js
```

## API

### Interfaces

#### `SupabaseSettings`

Connection settings for the Supabase integration.

Every field is optional — anything not set explicitly via
{@link configureSupabase} falls back to environment variables, read lazily
at first client creation (never at module load):

- `url`: `SUPABASE_URL` ?? `VITE_SUPABASE_URL`
- `anonKey`: `SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
  `VITE_SUPABASE_PUBLISHABLE_KEY`
- `serviceRoleKey`: `SUPABASE_SERVICE_ROLE_KEY`

```typescript
interface SupabaseSettings {
  /**
   * The Supabase project URL (e.g. `https://abcd1234.supabase.co`).
   */
  url?: string

  /**
   * The PUBLIC anon (publishable) key. Safe to expose in browsers — it grants
   * only what Row Level Security allows. Sufficient for verifying user JWTs.
   */
  anonKey?: string

  /**
   * The SECRET service-role key. Bypasses Row Level Security — server-only,
   * never exposed to clients. Not provisioned in molecule sandboxes by
   * default; check {@link hasServiceRole} before relying on it.
   */
  serviceRoleKey?: string
}
```

### Functions

#### `configureSupabase(settings)`

Explicitly sets (part of) the Supabase connection settings, overriding the
corresponding environment-variable fallbacks.

Merges with any previously configured settings, so it can be called with
just the piece that changed (e.g. only `serviceRoleKey` once the user
connects it). Invalidates the cached client singletons so the next
`getAnonClient()` / `getServiceClient()` call reflects the new settings.
Use `resetSupabase()` for a full clean slate.

```typescript
function configureSupabase(settings: SupabaseSettings): void
```

#### `getAnonClient()`

Returns the anon-key Supabase client (lazy singleton). Created on first
call from the resolved settings — explicit `configureSupabase()` values
first, env fallbacks second (`SUPABASE_URL` ?? `VITE_SUPABASE_URL`, and
`SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
`VITE_SUPABASE_PUBLISHABLE_KEY`).

The anon key is PUBLIC — this client requires no secret and is constrained
by Row Level Security. Use it for `verifyUserToken()` and for PostgREST
reads/writes that RLS already permits.

```typescript
function getAnonClient(): SupabaseClient<any, "public", "public", any, any>
```

#### `getServiceClient()`

Returns the service-role (admin) Supabase client (lazy singleton). Bypasses
Row Level Security — server-only, for admin operations the anon client
cannot perform.

```typescript
function getServiceClient(): SupabaseClient<any, "public", "public", any, any>
```

#### `hasServiceRole()`

Whether a service-role key is available (explicitly configured or via
`SUPABASE_SERVICE_ROLE_KEY`). ALWAYS check this before calling
`getServiceClient()` — molecule sandboxes do NOT provision the key by
default, so admin paths must degrade gracefully or ask the user to
connect it.

```typescript
function hasServiceRole(): boolean
```

#### `resetSupabase()`

Test hook: clears the cached clients AND any settings set via
`configureSupabase()`, returning the module to its pristine state. The next
client creation re-reads the environment from scratch.

```typescript
function resetSupabase(): void
```

### Constants

#### `provider`

External authentication provider backed by Supabase. Wire it at startup:
`setProvider(provider)` from `@molecule/api-external-auth`.

```typescript
const provider: ExternalAuthProvider
```

## Core Interface
Implements `@molecule/api-external-auth` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-external-auth'
import { provider } from '@molecule/api-external-auth-supabase'

export function setupExternalAuthSupabase(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-external-auth` ^1.0.0

### Runtime Dependencies

- `@molecule/api-external-auth`
- `@supabase/supabase-js`

- The anon key is PUBLIC (it ships in the browser bundle of every Supabase
  app) — `provider.verifyUserToken()` and `getAnonClient()` need NO secret.
  Do not treat a missing service-role key as "Supabase is unusable".
- `SUPABASE_SERVICE_ROLE_KEY` is NOT provisioned in molecule sandboxes and
  never will be by default. Check `hasServiceRole()` and degrade gracefully
  or ask the user to connect it in the Environment panel — never assume it
  exists. Migrations/DDL against the user's hosted Supabase database cannot
  run from the sandbox.
- New server-side tables belong in the provisioned `DATABASE_URL` Postgres,
  NOT in the user's hosted Supabase — unless the user has connected
  Supabase credentials that allow it.
- This package is SERVER-ONLY. It throws immediately if bundled into
  browser/client code — import it only from server code, and never polyfill
  `Buffer`/`process` to silence the guard.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The provider bond matching the app's auth platform is wired with
  `setProvider()` at startup — no "No external-auth provider bonded" errors
  appear in server logs when hitting protected routes.
- [ ] Log in through the app's existing auth UI, then hit a protected API
  route: `verifyUserToken()` accepts the live session token and the route
  returns that user's data.
- [ ] The counterparty is the auth platform itself: obtain a REAL user token
  by signing up / logging in through the app's own UI (`interact_preview`)
  and exercise `verifyUserToken()` with the token the frontend sends —
  never fabricate, hand-mint, or replay a made-up token as a "valid" case.
- [ ] A garbage or expired Bearer token gets a clean 401 from protected
  routes (`verifyUserToken()` → `null`) — never a 500 or a crash.
- [ ] A request with no Authorization header is rejected as
  unauthenticated (401), not treated as a server error.
- [ ] Server-side records created for the logged-in user are keyed on the
  verified `userId`, and another user's token never reads them back.
