# @molecule/api-oauth-google

Google OAuth provider for molecule.dev.

## Setup

1. Log into [Google](https://google.com) (or sign up).

2. Open the [Google API Console](https://console.developers.google.com/) and create a new project if you do not already have one.

    > If you're releasing your app on Google Play, you can use the "Google Play Console Developer" project automatically created by Google Play.

3. Configure your project's OAuth consent screen if you have not already.

    3.1. Open the [OAuth consent screen page](https://console.cloud.google.com/apis/credentials/consent) for your project.

    3.2. For most apps, choose the "External" option for "User Type".

    3.3. Fill out your app information. Note that if you include a logo, you may have to go through a verification process with Google which can take 4 to 6 weeks.

    3.4. At a minimum, add the `/auth/userinfo.email` and `/auth/userinfo.profile` scopes.

    3.5. Add at least one test user. You can enter your current Google login's email address.

4. Open your project's [Credentials page](https://console.developers.google.com/apis/credentials).

5. Google may have already automatically created an "Web client" for you, found under the "OAuth 2.0 Client IDs" section. If not, you will need to create an OAuth client.

    5a. If you already have an OAuth client you would like to use, view it by clicking the name. Your client credentials should be visible on the right.

      - Copy the client ID and set it to your API's `OAUTH_GOOGLE_CLIENT_ID` environment variable and your app's `REACT_APP_GOOGLE_CLIENT_ID` environment variable.

      - Copy the client secret and set it to your API's `OAUTH_GOOGLE_CLIENT_SECRET` environment variable.

    5b. To create a new OAuth client, click "Create credentials" at the top and choose "OAuth client ID".

      - Choose "Web application" for the application type.

      - Enter the name of your Google OAuth client.

      - For development, add `http://localhost:3000` to both the "Authorized JavaScript origins" and "Authorized redirect URIs".

      - For production, add your app's origin to both the "Authorized JavaScript origins" and "Authorized redirect URIs". This should typically match your API's `APP_ORIGIN` environment variable.

      - Click "Create".

      - Copy the client ID and set it to your API's `OAUTH_GOOGLE_CLIENT_ID` environment variable and your app's `REACT_APP_GOOGLE_CLIENT_ID` environment variable.

      - Copy the client secret and set it to your API's `OAUTH_GOOGLE_CLIENT_SECRET` environment variable.

6. Restart your API and/or rebuild your app so that they have the environment variables.

> **Your users should now be able to log in via Google!**

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-google @molecule/api-bond @molecule/api-http @molecule/api-oauth @molecule/api-secrets
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

#### `getAuthorizeUrl(params)`

Builds the Google authorization URL for OAuth initiation
(`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
client id and OpenID scopes (`openid email profile` — exactly what
`verify`'s OpenID userinfo call reads: `sub`, `email`, `email_verified`,
and profile fields) plus the caller's CSRF `state` and PKCE S256
challenge, so no consumer hardcodes Google knowledge. The authorize
endpoint defaults to Google's v2 endpoint but can be overridden via
`OAUTH_GOOGLE_AUTHORIZE_URL` for proxy deployments or E2E mock OAuth
servers (consistent with `OAUTH_GOOGLE_TOKEN_URL` / `OAUTH_GOOGLE_USER_URL`).

Deliberately does NOT request `access_type=offline`: `verify` uses the
access token exactly once (a single userinfo fetch) and never stores or
uses a refresh token, so requesting standing offline access would ask
users to consent to access this bond never exercises. Do not "helpfully"
add it back unless the bond actually starts persisting and refreshing
tokens.

```typescript
function getAuthorizeUrl({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}: OAuthAuthorizeUrlParams): string | null
```

- `params` — State, PKCE challenge, and optional redirect URI.

**Returns:** The Google authorize URL, or `null` when `OAUTH_GOOGLE_CLIENT_ID` is unset.

#### `verify(code, codeVerifier, redirectUri)`

Verifies a Google OAuth code and responds with OAuth-related user props.

Endpoints can be overridden via `OAUTH_GOOGLE_TOKEN_URL` and
`OAUTH_GOOGLE_USER_URL` for testing (E2E mocks) or proxy deployments.

```typescript
function verify(code: string, codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; emailVerified: boolean; oauthServer: "google"; oauthId: string; oauthData: Record<string, unknown>; } | null>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used).
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** An `OAuthUserInfo` with the user's Google email/sub, and OAuth ID —
 * or `null` when Google affirmatively rejected the code (HTTP 400
 * `invalid_grant`: bad/expired/already-redeemed code or PKCE verifier
 * mismatch), which the consumer surfaces as a 403 rather than a 500.

### Constants

#### `oauthGoogleSecretDefinitions`

Secret definitions required by the Google OAuth bond.

```typescript
const oauthGoogleSecretDefinitions: SecretDefinition[]
```

#### `serverName`

The OAuth server identifier for Google.

```typescript
const serverName: "google"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { serverName, verify, getAuthorizeUrl } from '@molecule/api-oauth-google'

export function setupOauthGoogle(): void {
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

- `OAUTH_GOOGLE_CLIENT_ID` *(required)* — Google OAuth client ID
  - Setup: Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application); add your app origin as an authorized JavaScript origin, and the app origin plus each page path that starts OAuth (e.g. {appUrl}/login) as authorized redirect URIs.
  - Get it here: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  - Example: `1234567890-abc.apps.googleusercontent.com`
- `OAUTH_GOOGLE_CLIENT_SECRET` *(required)* — Google OAuth client secret
  - Setup: Shown when creating the OAuth 2.0 Client ID in Google Cloud Console.
  - Get it here: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  - Example: `GOCSPX-...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-http`
- `@molecule/api-oauth`
- `@molecule/api-secrets`

The token exchange (`verify`'s call to Google's token endpoint) is
`application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 and Google's own
docs — matching every other molecule.dev OAuth bond (gitlab, twitter,
github, apple, microsoft).
