# @molecule/api-oauth

OAuth core interface for molecule.dev.

Defines the standard interface for OAuth providers.

## Type
`core`

## Installation
```bash
npm install @molecule/api-oauth
```

## API

### Interfaces

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
  redirectUri?: string

  /**
   * The CSRF `state` parameter bound to the initiating session (stored in
   * an httpOnly cookie by the initiation endpoint and validated by the
   * login handler on callback).
   */
  state: string

  /**
   * PKCE code challenge derived (S256) from the per-session code verifier.
   * Omit only for providers that do not support PKCE.
   */
  codeChallenge?: string

  /**
   * PKCE challenge method. Always prefer `'S256'`; `'plain'` exists only
   * for providers that cannot hash.
   */
  codeChallengeMethod?: 'S256' | 'plain'
}
```

#### `OAuthProviderConfig`

Configuration for an OAuth provider.

```typescript
interface OAuthProviderConfig {
  /**
   * The OAuth server identifier.
   */
  serverName: string

  /**
   * The OAuth verification function.
   */
  verify: OAuthVerifier

  /**
   * Builds the provider authorization URL for the initiation redirect.
   * Optional for backward compatibility: bonds without it can still verify
   * codes (the app initiates some other way), but the standard
   * `GET /users/oauth/:provider` initiation endpoint requires it and
   * responds 404 for providers that lack it.
   */
  getAuthorizeUrl?: OAuthAuthorizeUrlBuilder
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
  username: string

  /**
   * The user's display name from the OAuth provider.
   */
  name?: string

  /**
   * The user's email address from the OAuth provider.
   */
  email?: string

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
  emailVerified?: boolean

  /**
   * The OAuth server identifier (e.g., 'github', 'google', 'twitter').
   */
  oauthServer: string

  /**
   * Unique identifier for the user from the OAuth provider.
   */
  oauthId: string

  /**
   * Raw user data from the OAuth provider.
   */
  oauthData: Record<string, unknown>
}
```

### Types

#### `OAuthAuthorizeUrlBuilder`

Builds the provider's authorization URL for OAuth initiation
(`GET /users/oauth/:provider` → 302 to this URL). Implementations embed
their own client id, scopes, and authorize endpoint so no consumer ever
hardcodes provider knowledge.

```typescript
type OAuthAuthorizeUrlBuilder = (params: OAuthAuthorizeUrlParams) => string | null
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
type OAuthVerifier = (
  code: string,
  codeVerifier?: string,
  redirectUri?: string,
) => Promise<OAuthUserProps | null>
```

## Available Providers

| Provider | Package |
|----------|---------|
| Apple OAuth | `@molecule/api-oauth-apple` |
| GitHub OAuth | `@molecule/api-oauth-github` |
| GitLab OAuth | `@molecule/api-oauth-gitlab` |
| Google OAuth | `@molecule/api-oauth-google` |
| Microsoft OAuth | `@molecule/api-oauth-microsoft` |
| Twitter OAuth | `@molecule/api-oauth-twitter` |
