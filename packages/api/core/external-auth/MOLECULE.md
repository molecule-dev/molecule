# @molecule/api-external-auth

External authentication interface for molecule.dev.

Verifies a user token issued by an imported app's own auth platform
(Supabase, Firebase, Clerk, ...). Apps imported into molecule.dev usually
arrive with a working frontend auth flow — their users already hold session
tokens from that platform. This core is the server-side capability for
accepting those tokens: `verifyUserToken()` turns the token the frontend
already sends into a verified `{ userId, email }`, or `null` when it is
invalid or expired.

Use `setProvider()` to wire the concrete implementation from the provider
bond matching the app's platform, such as
`@molecule/api-external-auth-supabase`.

## Quick Start

```ts
// bonds.ts — wire the provider matching the imported app's auth platform:
import { setProvider } from '@molecule/api-external-auth'
import { provider } from '@molecule/api-external-auth-supabase'

setProvider(provider)
```

```ts
// A protected server route — verify the token the frontend already sends:
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

## Type
`core`

## Installation
```bash
npm install @molecule/api-external-auth @molecule/api-bond
```

## API

### Interfaces

#### `ExternalAuthProvider`

Contract implemented by external-auth provider bonds
(e.g. `@molecule/api-external-auth-supabase`).

```typescript
interface ExternalAuthProvider {
  /**
   * Verifies a user token issued by the external auth platform and returns
   * the verified identity, or `null` when the token is invalid, expired, or
   * empty. Never throws on a bad token — a bad token is a normal runtime
   * condition, not an error.
   *
   * @param token - The raw token the app's frontend already sends (typically
   *   the `Authorization: Bearer <token>` value).
   * @returns The verified user, or `null` if the token cannot be verified.
   */
  verifyUserToken(token: string): Promise<ExternalAuthUser | null>
}
```

#### `ExternalAuthUser`

The verified identity extracted from an external auth platform's user
token by {@link ExternalAuthProvider.verifyUserToken}.

```typescript
interface ExternalAuthUser {
  /**
   * The platform's stable user id (e.g. Supabase `auth.users.id`, a Firebase
   * UID, a Clerk user id).
   */
  userId: string

  /**
   * The user's email address, when present on the token's user record.
   */
  email?: string
}
```

### Functions

#### `getProvider()`

Retrieves the bonded external-auth provider, throwing if none is
configured.

```typescript
function getProvider(): ExternalAuthProvider
```

**Returns:** The bonded external-auth provider.

#### `hasProvider()`

Checks whether an external-auth provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an external-auth provider is bonded.

#### `setProvider(provider)`

Registers an external-auth provider as the active singleton. Called by
bond packages (matched to the imported app's auth platform) during
application startup.

```typescript
function setProvider(provider: ExternalAuthProvider): void
```

- `provider` — The external-auth provider implementation to bond.

#### `verifyUserToken(token)`

Verifies a user token issued by the imported app's own auth platform using
the bonded provider, returning the verified identity or `null` when the
token is invalid, expired, or empty (never throws on a bad token).

```typescript
function verifyUserToken(token: string): Promise<ExternalAuthUser | null>
```

- `token` — The raw token the app's frontend already sends (typically

**Returns:** The verified user, or `null` if the token cannot be verified.

## Available Providers

| Provider | Package |
|----------|---------|
| Supabase | `@molecule/api-external-auth-supabase` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`

**This is how you authenticate an IMPORTED app's existing users
server-side.** Do not hand-roll JWT verification against the vendor's API
or rebuild the app's auth from scratch — the provider bond matching the
app's platform does the vendor-specific work, and the app's frontend keeps
the login flow it already has.

- A bad token is a normal runtime condition: `verifyUserToken()` resolves
  `null` for invalid/expired/empty tokens — map that to a 401, never a 500.
- `verifyUserToken()` THROWS only when no provider is bonded — that is a
  wiring bug: call `setProvider()` from the matching bond at startup.
- The verified `userId` is the external platform's stable user id — key
  your server-side records on it.

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
