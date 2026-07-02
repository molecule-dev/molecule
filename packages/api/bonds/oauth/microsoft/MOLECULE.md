# @molecule/api-oauth-microsoft

Microsoft Identity Platform OAuth provider for molecule.dev.

Implements the `@molecule/api-oauth` contract (`serverName` + `verify`)
for compatibility with the existing OAuth bond wiring, plus a richer
`OAuthProvider` surface (`getAuthorizationUrl`,
`exchangeCodeForTokens`, `getUserInfo`, `refreshAccessToken`,
`verifyIdToken`) for apps that need OpenID Connect, refresh-token
rotation, or Microsoft Graph access (Outlook, OneDrive, Teams).

## Setup

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/).

2. Navigate to **Applications → App registrations → New registration**.

    - Choose **Accounts in any organizational directory and personal
      Microsoft accounts** for multi-tenant + consumer login (matches
      the default `OAUTH_MICROSOFT_TENANT_ID=common`). For
      single-tenant apps, choose **Accounts in this organizational
      directory only** and set `OAUTH_MICROSOFT_TENANT_ID` to the
      directory tenant id.
    - Add a **Web** redirect URI matching your app origin
      (e.g., `http://localhost:3000` for development, your production
      origin otherwise — must match the `redirectUri` passed to
      `getAuthorizationUrl` and `exchangeCodeForTokens`).

3. After registration:

    - Copy the **Application (client) ID** to your API's
      `OAUTH_MICROSOFT_CLIENT_ID` and your app's
      `REACT_APP_OAUTH_MICROSOFT_CLIENT_ID` environment variables.

    - Open **Certificates & secrets → Client secrets → New client
      secret**, then copy the secret value (NOT the secret id) to
      your API's `OAUTH_MICROSOFT_CLIENT_SECRET` environment variable.

    - For single-tenant apps, also set
      `OAUTH_MICROSOFT_TENANT_ID` to the directory tenant id.

4. Under **API permissions**, add the delegated Microsoft Graph
   permissions you need. The defaults granted by the
   `openid email profile User.Read` scope suffice for sign-in.

5. Restart your API and/or rebuild your app so they pick up the
   environment variables.

> **Your users should now be able to log in via Microsoft!**

## Quick Start

```ts
import { bond } from '@molecule/api-bond'
import * as microsoft from '@molecule/api-oauth-microsoft'

bond('oauth', microsoft.serverName, microsoft)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-microsoft
```

## API

### Interfaces

#### `JsonWebKey`

RFC 7517 JSON Web Key (RS256 subset).

```typescript
interface JsonWebKey {
  kty: string
  use?: string
  kid: string
  n: string
  e: string
  alg?: string
  x5c?: string[]
}
```

#### `JwksResponse`

Discovery response shape for the `/discovery/v2.0/keys` endpoint.

```typescript
interface JwksResponse {
  keys: JsonWebKey[]
}
```

#### `MicrosoftIdTokenClaims`

Verified ID token claims returned by `verifyIdToken`.

Only the validated subset of OpenID claims is exposed — the full raw
payload is included as `claims` for callers that need additional
fields, but only after signature/issuer/audience/expiry checks pass.

```typescript
interface MicrosoftIdTokenClaims {
  /** Subject identifier (Microsoft user object id). */
  sub: string
  /** Issuer URL. */
  iss: string
  /** Audience (the OAuth client ID). */
  aud: string
  /** Expiry (epoch seconds). */
  exp: number
  /** Issued-at (epoch seconds). */
  iat: number
  /** Email address, when present. */
  email?: string
  /** Preferred username (often the UPN), when present. */
  preferred_username?: string
  /** Display name, when present. */
  name?: string
  /** Tenant id from the token. */
  tid?: string
  /** Object id from the token. */
  oid?: string
  /** Full validated payload for additional non-standard claims. */
  claims: Record<string, unknown>
}
```

#### `MicrosoftOAuthConfig`

Optional configuration for the Microsoft OAuth provider.

`tenantId` overrides the path segment in Microsoft endpoints. Defaults
to `"common"` (multi-tenant + personal accounts). For single-tenant
apps, pass the directory tenant GUID.

```typescript
interface MicrosoftOAuthConfig {
  /**
   * Microsoft tenant identifier. Defaults to `"common"`.
   *
   * Common values: `"common"`, `"organizations"`, `"consumers"`, or a
   * tenant GUID such as `"00000000-0000-0000-0000-000000000000"`.
   */
  tenantId?: string

  /** Override OAuth client ID. Defaults to `process.env.OAUTH_MICROSOFT_CLIENT_ID`. */
  clientId?: string

  /** Override OAuth client secret. Defaults to `process.env.OAUTH_MICROSOFT_CLIENT_SECRET`. */
  clientSecret?: string

  /**
   * Default OAuth scopes when none are passed to `getAuthorizationUrl`.
   * Defaults to `'openid email profile User.Read'`.
   */
  defaultScope?: string
}
```

#### `MicrosoftTokenSet`

Token response from the Microsoft `/token` endpoint.

Microsoft rotates refresh tokens — always persist whatever
`refresh_token` value is returned, replacing the previous one.

```typescript
interface MicrosoftTokenSet {
  /** Bearer access token used for Microsoft Graph requests. */
  accessToken: string
  /** OpenID Connect ID token (JWT) for `verifyIdToken`. */
  idToken?: string
  /** Refresh token (rotated by Microsoft on every refresh). */
  refreshToken?: string
  /** Token type (typically `"Bearer"`). */
  tokenType: string
  /** Lifetime of `accessToken` in seconds, when reported. */
  expiresIn?: number
  /** Granted scope string (space-delimited). */
  scope?: string
}
```

#### `OAuthProvider`

Microsoft Identity Platform OAuth provider surface.

Higher-level than the core `OAuthVerifier` contract — exposes the full
OAuth 2.0 / OpenID Connect lifecycle (auth URL, token exchange,
refresh, id-token verification) needed by apps that integrate Outlook,
OneDrive, Teams, or any Graph API.

```typescript
interface OAuthProvider {
  /** OAuth server identifier (`"microsoft"`). */
  readonly serverName: string

  /**
   * Build the authorization URL the user is redirected to.
   * @param params - Authorization request parameters.
   * @returns Fully-qualified URL to begin the OAuth flow.
   */
  getAuthorizationUrl(params: { state: string; redirectUri: string; scope?: string }): string

  /**
   * Exchange an authorization code for an access/id/refresh token set.
   * @param code - Authorization code returned by Microsoft.
   * @param redirectUri - Redirect URI matching the authorization request.
   * @returns The token set.
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<MicrosoftTokenSet>

  /**
   * Fetch normalized user info from Microsoft Graph (`/v1.0/me`).
   * @param accessToken - Access token previously obtained.
   * @returns Normalized user info.
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>

  /**
   * Use a refresh token to obtain a fresh access/id/refresh token set.
   *
   * Microsoft rotates refresh tokens — the returned token set's
   * `refreshToken` (when present) supersedes the input token.
   * @param refreshToken - Existing refresh token.
   * @returns New token set.
   */
  refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenSet>

  /**
   * Verify a Microsoft-issued ID token (RS256), validating signature
   * via JWKS plus `iss`, `aud`, and `exp` claims.
   *
   * JWKS is fetched from the discovery endpoint and cached in memory
   * for one hour.
   *
   * @param idToken - The compact JWS string to verify.
   * @returns Validated claims.
   */
  verifyIdToken(idToken: string): Promise<MicrosoftIdTokenClaims>
}
```

#### `OAuthUserInfo`

Normalized user info returned by OAuth providers.

Matches the shape used across bonds — id/email/name/picture — derived
from `OAuthUserProps` so consumers do not need provider-specific shapes.

```typescript
interface OAuthUserInfo {
  /** Unique identifier from the provider. */
  id: string
  /** User's email address, when available. */
  email?: string
  /** User's display name, when available. */
  name?: string
  /** URL of the user's profile picture, when available. */
  picture?: string
}
```

#### `OAuthUserProps`

The properties returned when verifying an OAuth code.

```typescript
interface OAuthUserProps {
    /**
     * An alphanumeric username derived from the OAuth provider.
     *
     * Format: `{provider_username}@{provider_name}`
     */
    username: string;
    /**
     * The user's display name from the OAuth provider.
     */
    name?: string;
    /**
     * The user's email address from the OAuth provider.
     */
    email?: string;
    /**
     * Whether the OAuth provider has affirmatively verified that the user
     * controls this `email` mailbox.
     *
     * `true` MUST mean the provider proved mailbox ownership (e.g. Google's
     * `email_verified`, Apple's `email_verified` ID-token claim). When the
     * provider exposes no trustworthy verification signal in the profile data
     * the verifier fetched, this MUST be `false`/`undefined` (never optimistically
     * `true`) — consumers treat only an explicit `true` as verified.
     *
     * Consumers (e.g. the user resource's `logInOAuth` handler) use this to
     * decide whether a provider-supplied email may be trusted over an existing,
     * unverified local account — preventing an unverified squatter from blocking
     * the verified mailbox owner.
     */
    emailVerified?: boolean;
    /**
     * The OAuth server identifier (e.g., 'github', 'google', 'twitter').
     */
    oauthServer: string;
    /**
     * Unique identifier for the user from the OAuth provider.
     */
    oauthId: string;
    /**
     * Raw user data from the OAuth provider.
     */
    oauthData: Record<string, unknown>;
}
```

### Types

#### `OAuthVerifier`

Exchanges an OAuth authorization code for user profile information.

Implementations call the provider's token and user-info endpoints,
then return normalized `OAuthUserProps` for account creation or login.

```typescript
type OAuthVerifier = (code: string, codeVerifier?: string, redirectUri?: string) => Promise<OAuthUserProps>;
```

### Functions

#### `allowedIssuers(tenantId, tokenTid)`

Acceptable issuer URLs for a given Microsoft tenant.

The configured `tenantId` decides whether the token's own `tid` may
resolve the accepted issuer:

- **Single-tenant pin** (a concrete tenant GUID): the issuer is fixed to
  that exact tenant. The token's `tid` is NEVER used to widen the accepted
  issuer set — Microsoft's public-cloud signing keys are shared across all
  tenants, so a validly-signed token from a *different* tenant would
  otherwise pass a single-tenant pin (a cross-tenant authentication
  bypass). The caller's separate `tid`-vs-config check (see
  `verifyMicrosoftIdToken`) is what enforces the tenant; this function does
  not silently trust an attacker-supplied `tid`.
- **Multi-tenant authority** (`common` / `organizations` / `consumers`):
  Microsoft's v2.0 issuer is the templated form
  `https://login.microsoftonline.com/{tid}/v2.0`, where `{tid}` is the
  signing tenant. Here accepting the token's `tid`-derived issuer IS the
  documented contract (the app intentionally allows any directory), so it
  is permitted.

```typescript
function allowedIssuers(tenantId: string, tokenTid?: string): string[]
```

- `tenantId` — The configured tenant id (`"common"` by default).
- `tokenTid` — The `tid` claim from the token, when present.

**Returns:** A list of acceptable `iss` values.

#### `clearJwksCache()`

Clear the in-memory JWKS cache (test-only / forced refresh).

```typescript
function clearJwksCache(): void
```

#### `createMicrosoftProvider(overrides)`

Build a Microsoft OAuth provider with optional config overrides.

```typescript
function createMicrosoftProvider(overrides?: MicrosoftOAuthConfig): OAuthProvider
```

- `overrides` — Optional configuration overrides.

**Returns:** A typed `OAuthProvider`.

#### `getJwks(tenantId, options)`

Fetch (and cache) the JWKS document for a Microsoft tenant.

Cache TTL is one hour. Pass `force: true` (e.g., on a key-id miss)
to bypass the cache and refresh.

```typescript
function getJwks(tenantId: string, options?: { force?: boolean; now?: () => number; }): Promise<JsonWebKey[]>
```

- `tenantId` — Microsoft tenant identifier.
- `options` — Optional overrides.

**Returns:** The list of JWKs from the tenant.

#### `jwksUrlFor(tenantId)`

Build the JWKS discovery URL for a given Microsoft tenant.

```typescript
function jwksUrlFor(tenantId: string): string
```

- `tenantId` — Microsoft tenant identifier (e.g., `"common"`).

**Returns:** The fully-qualified JWKS endpoint URL.

#### `resolveConfig(overrides)`

Resolve effective configuration by layering an explicit config over
environment variables. Pure — does no I/O.

```typescript
function resolveConfig(overrides?: MicrosoftOAuthConfig): { tenantId: string; clientId: string; clientSecret: string; defaultScope: string; }
```

- `overrides` — Partial configuration to merge over env defaults.

**Returns:** The fully-resolved configuration.

#### `sanitizeError(error, secrets)`

Strip client secrets and refresh tokens from an error before logging
or rethrowing. Mutates and returns a new error-like object.

```typescript
function sanitizeError(error: unknown, secrets: string[]): Error
```

- `error` — The original error.
- `secrets` — Sensitive strings to redact.

**Returns:** A sanitized error suitable for logging or surfacing.

#### `verify(code, _codeVerifier, redirectUri)`

Verifies a Microsoft OAuth code and responds with normalized
`OAuthUserProps` for compatibility with the core `@molecule/api-oauth`
`OAuthVerifier` contract — exchanges the code, fetches `/me` from
Microsoft Graph, and shapes the result.

```typescript
function verify(code: string, _codeVerifier?: string, redirectUri?: string): Promise<{ username: string; name: string | undefined; email: string | undefined; emailVerified: false; oauthServer: "microsoft"; oauthId: string; oauthData: Record<string, unknown>; }>
```

- `code` — The authorization code from the OAuth callback.
- `_codeVerifier` — PKCE code verifier (currently unused; reserved
- `redirectUri` — The redirect URI used in the authorization

**Returns:** Normalized `OAuthUserProps`.

#### `verifyMicrosoftIdToken(idToken, config, options)`

Verify a Microsoft-issued ID token end-to-end (signature, issuer,
audience, expiry).

```typescript
function verifyMicrosoftIdToken(idToken: string, config: { tenantId: string; audience: string; }, options?: { now?: () => number; refreshOnMiss?: boolean; }): Promise<MicrosoftIdTokenClaims>
```

- `idToken` — Compact JWS.
- `config` — Tenant + audience config.
- `options` — Optional clock + JWKS refresh hooks (test seams).

**Returns:** Validated claims.

#### `verifyRs256Signature(jwk, signingInput, signature)`

Verify an RS256 signature against the supplied JWK.

```typescript
function verifyRs256Signature(jwk: JsonWebKey, signingInput: string, signature: string): boolean
```

- `jwk` — JSON Web Key with `kty: "RSA"` and `alg: "RS256"`.
- `signingInput` — Concatenated `${header}.${payload}` string.
- `signature` — Base64url-encoded signature segment.

**Returns:** `true` if the signature verifies.

### Constants

#### `DEFAULT_SCOPE`

Default OAuth scopes when none are supplied.

```typescript
const DEFAULT_SCOPE: "openid email profile User.Read"
```

#### `GRAPH_ME_URL`

Microsoft Graph endpoint for the signed-in user.

```typescript
const GRAPH_ME_URL: "https://graph.microsoft.com/v1.0/me"
```

#### `provider`

Default Microsoft OAuth provider, configured from environment.

Use `createMicrosoftProvider()` with explicit config for tests or
multi-tenant apps that need per-request configuration.

```typescript
const provider: OAuthProvider
```

#### `serverName`

The OAuth server identifier for Microsoft.

```typescript
const serverName: "microsoft"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { serverName, verify } from '@molecule/api-oauth-microsoft'

export function setupOauthMicrosoft(): void {
  bond('oauth', serverName, { serverName, verify })
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-oauth` ^1.0.0

### Environment Variables

- `OAUTH_MICROSOFT_CLIENT_ID` *(required)* — Microsoft application (client) ID
  - Setup: Microsoft Entra ID → App registrations → New registration; copy the Application (client) ID.
  - Get it here: [https://entra.microsoft.com/](https://entra.microsoft.com/)
- `OAUTH_MICROSOFT_CLIENT_SECRET` *(required)* — Microsoft client secret
  - Setup: App registration → Certificates & secrets → New client secret; copy the Value.
  - Get it here: [https://entra.microsoft.com/](https://entra.microsoft.com/)
- `OAUTH_MICROSOFT_TENANT_ID` *(optional)* — Microsoft directory (tenant) ID
  - Setup: Copy the Directory (tenant) ID from the app registration overview, or use "common" for multi-tenant.
  - Get it here: [https://entra.microsoft.com/](https://entra.microsoft.com/)
  - Example: `common`

**ID-token issuer / tenant validation contract.** `verifyMicrosoftIdToken`
(and `provider.verifyIdToken`) validate `iss` against the issuer(s) implied
by the *configured* tenant (`OAUTH_MICROSOFT_TENANT_ID` / `config.tenantId`)
— never against the token's own `tid`. This matters because Microsoft's
public-cloud signing keys are **shared across every tenant**, so a
validly-signed token issued for a *different* directory would otherwise
satisfy a single-tenant configuration (a cross-tenant authentication
bypass). The rule:

- **Concrete tenant GUID configured (single-tenant pin):** the accepted
  issuer is fixed to that exact tenant, and the token's `tid` must equal the
  configured tenant. A token's self-asserted `tid` can NOT widen the
  accepted issuer set.
- **`common` / `organizations` / `consumers` (multi-tenant):** any
  directory's users may sign in by design, so the token's `tid`-derived
  `https://login.microsoftonline.com/{tid}/v2.0` issuer IS accepted — this
  is the documented multi-tenant contract, not a widening of a pin.

Pin to a single tenant by setting `OAUTH_MICROSOFT_TENANT_ID` to the
directory GUID; leave it `common` only when multi-tenant sign-in is
intended.
