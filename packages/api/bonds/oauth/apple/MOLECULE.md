# @molecule/api-oauth-apple

Sign in with Apple OAuth provider for molecule.dev.

## Setup

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/).

2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
   console, create:

   - An **App ID** with the *Sign in with Apple* capability enabled.
   - A **Services ID** whose identifier becomes your `OAUTH_APPLE_CLIENT_ID`.
     Configure its *Sign in with Apple* settings with your domain and the
     exact redirect URI(s) you will use (e.g. `https://yourapp.com/auth/apple/callback`).
   - A **Key** with *Sign in with Apple* enabled. Download the resulting
     `.p8` file once (Apple does not allow re-download). The 10-character
     Key ID becomes `OAUTH_APPLE_KEY_ID`; the file's contents become
     `OAUTH_APPLE_PRIVATE_KEY`.

3. Locate your **Team ID** at the top right of the developer console;
   set it to `OAUTH_APPLE_TEAM_ID`.

4. Configure your API environment:

   - `OAUTH_APPLE_CLIENT_ID` — the Services ID
   - `OAUTH_APPLE_TEAM_ID` — your Apple Developer Team ID
   - `OAUTH_APPLE_KEY_ID` — the 10-character Key ID
   - `OAUTH_APPLE_PRIVATE_KEY` — the PKCS8 PEM contents of the `.p8` file
     (newlines may be encoded as `\n`)

5. Restart your API so it picks up the environment variables.

> **Your users should now be able to log in via Apple!**

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-apple
```

## API

### Interfaces

#### `AppleAuthorizationUrlOptions`

Options for {@link getAuthorizationUrl}.

```typescript
interface AppleAuthorizationUrlOptions {
  /** Opaque state token echoed back in the redirect (CSRF defence). */
  state: string

  /** Redirect URI — must exactly match a value registered in the Apple developer portal. */
  redirectUri: string

  /** Space-separated list of scopes. Defaults to `'name email'`. */
  scope?: string

  /** Optional nonce for replay protection. */
  nonce?: string

  /** Response mode (defaults to `form_post`, required when `scope` includes `name` or `email`). */
  responseMode?: 'query' | 'fragment' | 'form_post'
}
```

#### `AppleClientSecretInput`

Inputs required to mint an Apple client-secret JWT.

```typescript
interface AppleClientSecretInput {
  /** The Apple Developer Team ID (`iss` claim). */
  teamId: string
  /** The Apple Services ID / client ID (`sub` claim). */
  clientId: string
  /** The 10-character Apple Key ID (`kid` JWT header). */
  keyId: string
  /** PKCS8 PEM-encoded private key contents (the `.p8` file). */
  privateKey: string
  /** Optional override for token lifetime, in seconds. */
  lifetimeSeconds?: number
}
```

#### `AppleIdTokenClaims`

The decoded payload of an Apple ID token (a JWT issued by Apple at
`https://appleid.apple.com`). Apple does not expose a userinfo endpoint —
the ID token *is* the user info.

```typescript
interface AppleIdTokenClaims {
  /** Issuer — always `https://appleid.apple.com`. */
  iss: string

  /** Audience — the Apple Services ID (`OAUTH_APPLE_CLIENT_ID`). */
  aud: string

  /** Stable Apple-provided user identifier. */
  sub: string

  /** Issued-at timestamp (seconds since epoch). */
  iat: number

  /** Expiration timestamp (seconds since epoch). */
  exp: number

  /** Optional nonce echoed back from the authorization request. */
  nonce?: string

  /** Whether `nonce` was supplied. */
  nonce_supported?: boolean

  /** The user's email address, when permission was granted. */
  email?: string

  /** Whether Apple verified the email. Apple returns `'true'`/`'false'` strings or booleans. */
  email_verified?: boolean | string

  /** Whether the email is a private relay address Apple created for the user. */
  is_private_email?: boolean | string

  /** Real-user-status indicator (0=unsupported, 1=unknown, 2=likely real). */
  real_user_status?: number

  /** Indexable additional claims so callers may surface vendor extensions. */
  [key: string]: unknown
}
```

#### `AppleJwk`

A single public-key entry as returned by Apple's JWKS endpoint.

```typescript
interface AppleJwk {
  kty: string
  kid: string
  use?: string
  alg?: string
  n: string
  e: string
}
```

#### `AppleTokenResponse`

Tokens returned by Apple's `/auth/token` endpoint.

```typescript
interface AppleTokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token?: string
  token_type: string
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

#### `createAppleClientSecret(input)`

Signs an Apple client-secret JWT (ES256) suitable for use as the
`client_secret` parameter in `/auth/token` requests.

Note: this function intentionally does not include the private key in
any thrown error.

```typescript
function createAppleClientSecret({
  teamId,
  clientId,
  keyId,
  privateKey,
  lifetimeSeconds = APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS,
}: AppleClientSecretInput): string
```

- `input` — Team ID, client ID, key ID, and private key.

**Returns:** The compact-serialized JWT.

#### `exchangeCodeForTokens(code, redirectUri)`

Exchanges an authorization code for Apple-issued tokens.

```typescript
function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<AppleTokenResponse>
```

- `code` — The authorization code from the OAuth callback.
- `redirectUri` — The redirect URI used in the authorization request. Defaults to `APP_ORIGIN`.

**Returns:** The token-exchange response, including `id_token` and (typically) a `refresh_token`.

#### `getAppleJwks()`

Fetch Apple's JWKS, returning a `kid` → JWK map. Cached for {@link JWKS_CACHE_TTL_MS}.

```typescript
function getAppleJwks(): Promise<Map<string, AppleJwk>>
```

**Returns:** A map of `kid` to JWK suitable for verifying Apple ID tokens.

#### `getAuthorizationUrl(options)`

Returns the URL to which the user agent should be redirected to start the
Sign-in-with-Apple flow.

`response_mode=form_post` is the default because Apple only returns the
`name` and `email` scopes via form-post callbacks.

```typescript
function getAuthorizationUrl({
  state,
  redirectUri,
  scope = DEFAULT_APPLE_SCOPE,
  nonce,
  responseMode,
}: AppleAuthorizationUrlOptions): string
```

- `options` — State, redirect URI, and optional scope/nonce/response mode.

**Returns:** The fully-constructed authorization URL.

#### `getUserInfo(idToken)`

Apple does not expose a userinfo endpoint — the ID token *is* the user
info. This helper takes an Apple-issued ID token, verifies its
signature/issuer/audience/expiry, and returns the decoded claims.

```typescript
function getUserInfo(idToken: string): Promise<AppleIdTokenClaims>
```

- `idToken` — The Apple-issued ID token (JWT).

**Returns:** The verified {@link AppleIdTokenClaims}.

#### `jwkToPem(jwk)`

Convert a JWK to a PEM-encoded SPKI public key string suitable for
passing to `jsonwebtoken.verify` with algorithm `RS256`.

```typescript
function jwkToPem(jwk: AppleJwk): string
```

- `jwk` — The JWK to convert.

**Returns:** A PEM-encoded SPKI public key.

#### `refreshAccessToken(refreshToken)`

Exchanges a refresh token for a fresh access token (and possibly a new id_token).

```typescript
function refreshAccessToken(refreshToken: string): Promise<AppleTokenResponse>
```

- `refreshToken` — The refresh token previously issued by Apple.

**Returns:** The token-refresh response.

#### `resetJwksCache()`

Reset the JWKS cache. Exposed for tests; production code should not call this.

```typescript
function resetJwksCache(): void
```

#### `verify(code, _codeVerifier, redirectUri)`

Verifies an Apple OAuth authorization code and returns normalized
`OAuthUserProps`.

Note: Apple only includes the user's `name` in the *initial* form-post
callback (not in the ID token), so callers wanting display-name capture
must persist that value separately at the redirect-handler layer.

```typescript
function verify(code: string, _codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; oauthServer: "apple"; oauthId: string; oauthData: { access_token: string; id_token: string; refresh_token: string | undefined; token_type: string; expires_in: number; iss: string; aud: string; sub: string; iat: number; exp: number; nonce?: string; nonce_supported?: boolean; email?: string; email_verified?: boolean | string; is_private_email?: boolean | string; real_user_status?: number; }; }>
```

- `code` — The authorization code from the OAuth callback.
- `_codeVerifier` — Unused; included for {@link OAuthVerifier} signature compatibility.
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** Normalized OAuth user props.

#### `verifyIdToken(idToken)`

Verifies an Apple ID token. Fetches Apple's JWKS, locates the key
matching the token's `kid`, verifies the RS256 signature, then asserts
`iss === 'https://appleid.apple.com'`, `aud === OAUTH_APPLE_CLIENT_ID`,
and that the token has not expired.

```typescript
function verifyIdToken(idToken: string): Promise<AppleIdTokenClaims>
```

- `idToken` — The compact-serialized JWT to verify.

**Returns:** The decoded and validated {@link AppleIdTokenClaims}.

### Constants

#### `APPLE_AUTHORIZATION_URL`

Apple authorization endpoint.

```typescript
const APPLE_AUTHORIZATION_URL: "https://appleid.apple.com/auth/authorize"
```

#### `APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS`

Default client-secret JWT lifetime in seconds (5 minutes).

```typescript
const APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS: 300
```

#### `APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS`

Maximum lifetime Apple permits for a client-secret JWT (6 months in seconds).

```typescript
const APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS: 15777000
```

#### `APPLE_ID_TOKEN_ISSUER`

The expected `iss` claim for Apple-issued ID tokens.

```typescript
const APPLE_ID_TOKEN_ISSUER: "https://appleid.apple.com"
```

#### `APPLE_JWKS_URL`

Apple JWKS endpoint URL.

```typescript
const APPLE_JWKS_URL: "https://appleid.apple.com/auth/keys"
```

#### `APPLE_TOKEN_URL`

Apple token endpoint.

```typescript
const APPLE_TOKEN_URL: "https://appleid.apple.com/auth/token"
```

#### `DEFAULT_APPLE_SCOPE`

Default scope when callers do not specify one.

```typescript
const DEFAULT_APPLE_SCOPE: "name email"
```

#### `JWKS_CACHE_TTL_MS`

TTL for the cached JWKS, in milliseconds (1 hour).

```typescript
const JWKS_CACHE_TTL_MS: number
```

#### `serverName`

The OAuth server identifier for Apple.

```typescript
const serverName: "apple"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { serverName, verify } from '@molecule/api-oauth-apple'

export function setupOauthApple(): void {
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

- `OAUTH_APPLE_CLIENT_ID` *(required)*
- `OAUTH_APPLE_TEAM_ID` *(required)*
- `OAUTH_APPLE_KEY_ID` *(required)*
- `OAUTH_APPLE_PRIVATE_KEY` *(required)*
