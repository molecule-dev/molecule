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
npm install @molecule/api-oauth-apple @molecule/api-bond @molecule/api-http @molecule/api-oauth @molecule/api-secrets jsonwebtoken
npm install -D @types/jsonwebtoken
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

#### `OAuthAuthorizeUrlParams`

Parameters for building a provider authorization (initiation) URL —
the URL the user's browser is redirected to so the provider can
authenticate them and send back an authorization code.

```typescript
interface OAuthAuthorizeUrlParams {
    /**
     * Absolute URI the provider should redirect the user back to after
     * authorization (the app origin, optionally with a path). When omitted,
     * the builder leaves `redirect_uri` off the URL so the provider falls
     * back to its registered callback URL.
     */
    redirectUri?: string;
    /**
     * The CSRF `state` parameter bound to the initiating session (stored in
     * an httpOnly cookie by the initiation endpoint and validated by the
     * login handler on callback).
     */
    state: string;
    /**
     * PKCE code challenge derived (S256) from the per-session code verifier.
     * Omit only for providers that do not support PKCE.
     */
    codeChallenge?: string;
    /**
     * PKCE challenge method. Always prefer `'S256'`; `'plain'` exists only
     * for providers that cannot hash.
     */
    codeChallengeMethod?: 'S256' | 'plain';
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

#### `OAuthAuthorizeUrlBuilder`

Builds the provider's authorization URL for OAuth initiation
(`GET /users/oauth/:provider` → 302 to this URL). Implementations embed
their own client id, scopes, and authorize endpoint so no consumer ever
hardcodes provider knowledge.

```typescript
type OAuthAuthorizeUrlBuilder = (params: OAuthAuthorizeUrlParams) => string | null;
```

#### `OAuthVerifier`

Exchanges an OAuth authorization code for user profile information.

Implementations call the provider's token and user-info endpoints,
then return normalized `OAuthUserProps` for account creation or login.

Returning `null` means the provider AFFIRMATIVELY rejected the code
(e.g. GitHub's `bad_verification_code`, an expired/forged code) — the
consumer (`logInOAuth`) surfaces that as a clean 403 "verification
failed". A thrown error means an infrastructure failure (network,
provider outage) and surfaces as a 500. Implementations MUST NOT throw
for a rejected code — that would misreport a client mistake (or an
attack) as a server fault.

```typescript
type OAuthVerifier = (code: string, codeVerifier?: string, redirectUri?: string) => Promise<OAuthUserProps | null>;
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

#### `getAuthorizeUrl(params)`

Builds the Sign-in-with-Apple authorization URL for OAuth initiation
(`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
client id and default scopes (`name email`) plus the caller's CSRF
`state`, so no consumer hardcodes Apple knowledge.

`redirect_uri` resolves from `params.redirectUri` falling back to
`APP_ORIGIN` (the same fallback the token exchange uses) — Apple requires
an exact registered `redirect_uri` and has no registered-fallback
behavior, so the param is set whenever one resolves.

`response_mode=form_post` is required by Apple for the `name`/`email`
scopes: the callback arrives as an HTTP POST with `code`/`state` in the
form body, so `redirect_uri` must point at a server-side receiver that
forwards them into `POST /users/log-in/oauth` (see the module JSDoc).

Apple does not support PKCE: the `codeChallenge`/`codeChallengeMethod`
params are accepted (the shared initiation handler always sends them) but
deliberately not emitted — `form_post` keeping the code out of the URL is
the mitigation Apple recommends.

```typescript
function getAuthorizeUrl({
  redirectUri,
  state,
  // Apple's authorize endpoint does not support PKCE — accept the
  // code_challenge/code_challenge_method params from the shared contract
  // (the initiation handler always sends them) but deliberately do NOT
  // emit them. `response_mode=form_post` (code delivered in a POST body,
  // never in the URL) is the mitigation Apple recommends instead.
  codeChallenge: _codeChallenge,
  codeChallengeMethod: _codeChallengeMethod,
}: OAuthAuthorizeUrlParams): string | null
```

- `params` — State, PKCE challenge (accepted but unused), and optional redirect URI.

**Returns:** The Apple authorize URL, or `null` when `OAUTH_APPLE_CLIENT_ID` is unset.

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
`OAuthUserProps`, or `null` when Apple affirmatively rejects the code
(HTTP 400 `invalid_grant` from `/auth/token` — invalid/expired/reused) so
the consumer surfaces a clean 403 instead of a misleading 500.

Note: Apple only includes the user's `name` in the *initial* form-post
callback (not in the ID token), so callers wanting display-name capture
must persist that value separately at the redirect-handler layer.

```typescript
function verify(code: string, _codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; emailVerified: boolean; oauthServer: "apple"; oauthId: string; oauthData: { [key: string]: unknown; iss: string; aud: string; sub: string; iat: number; exp: number; nonce?: string; nonce_supported?: boolean; email?: string; email_verified?: boolean | string; is_private_email?: boolean | string; real_user_status?: number; }; } | null>
```

- `code` — The authorization code from the OAuth callback.
- `_codeVerifier` — Unused; included for {@link OAuthVerifier} signature compatibility.
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** Normalized OAuth user props, or `null` when Apple rejected the code.

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

#### `oauthAppleSecretDefinitions`

Secret definitions required by the Sign in with Apple OAuth bond.

```typescript
const oauthAppleSecretDefinitions: SecretDefinition[]
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
import { serverName, verify, getAuthorizeUrl } from '@molecule/api-oauth-apple'

export function setupOauthApple(): void {
  bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-oauth` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OAUTH_APPLE_CLIENT_ID` *(required)* — Apple Services ID
  - Setup: Apple Developer → Identifiers → create a Services ID with "Sign in with Apple" enabled.
  - Get it here: [https://developer.apple.com/account/resources/identifiers/list/serviceId](https://developer.apple.com/account/resources/identifiers/list/serviceId)
  - Example: `com.example.app.signin`
- `OAUTH_APPLE_TEAM_ID` *(required)* — Apple Team ID
  - Setup: The 10-character Team ID from your Apple Developer membership details.
  - Get it here: [https://developer.apple.com/account](https://developer.apple.com/account)
  - Example: `A1B2C3D4E5`
- `OAUTH_APPLE_KEY_ID` *(required)* — Apple key ID
  - Setup: Create a "Sign in with Apple" key under Certificates, Identifiers & Profiles → Keys.
  - Get it here: [https://developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list)
- `OAUTH_APPLE_PRIVATE_KEY` *(required)* — Apple private key (.p8)
  - Setup: Download the .p8 file when creating the key (one-time download) and paste its PEM contents.
  - Get it here: [https://developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list)
  - Example: `contents of AuthKey_ABC123DEF4.p8`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-http`
- `@molecule/api-oauth`
- `@molecule/api-secrets`
- `jsonwebtoken`
