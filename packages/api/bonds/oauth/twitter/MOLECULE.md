# @molecule/api-oauth-twitter

Twitter OAuth provider for molecule.dev.

## Setup

1. Log into [Twitter](https://twitter.com) (or sign up).

2. Open the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).

3. Create a new project/app and follow Twitter's steps. You may need to verify your account with a phone number.

4. Fill out your app's information and you should eventually arrive at a screen with an ID, secret, and bearer token. These are not the OAuth client ID and secret, but you should still store them somewhere safe.

5. Upload your app's logo and description if necessary.

    5.1. Return to Twitter's Developer Portal Dashboard.

    5.2. Open your app under "Projects & Apps".

    5.3. Click the "Edit" button.

    5.4. Upload an image.

    5.5. Update your app's description.

    5.6. Click the "Save" button.

6. Under "User authentication settings", click the "Set up" button to begin enabling OAuth.

7. Enable "OAuth 2.0".

8. Choose "Web App" for "Type of App".

9. Under "Callback URI / Redirect URL", add two entries:

    - For development: `http://localhost:3000`

    - For production: Your app's origin. This should typically match your API's `APP_ORIGIN` environment variable.

10. Fill out the remaining information as necessary and click the "Save" button.

11. You should be taken to a screen containing your OAuth client ID and secret.

    11.1. Set the client ID to your API's `OAUTH_TWITTER_CLIENT_ID` environment variable and your app's `REACT_APP_OAUTH_TWITTER_CLIENT_ID` environment variable.

    11.2. Set the client secret to your API's `OAUTH_TWITTER_CLIENT_SECRET` environment variable.

12. Restart your API and/or rebuild your app so that they have the environment variables.

> **Your users should now be able to log in via Twitter!**

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-twitter @molecule/api-bond @molecule/api-http @molecule/api-oauth @molecule/api-secrets
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

Builds the X (Twitter) authorization URL for OAuth initiation
(`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
client id and scopes (`users.read tweet.read` — exactly what `verify`'s
`GET /2/users/me` requires) plus the caller's CSRF `state` and PKCE S256
challenge. The authorize endpoint defaults to `https://x.com/i/oauth2/authorize`
but can be overridden via `OAUTH_TWITTER_AUTHORIZE_URL` for E2E mocks.

X **mandates PKCE** on every authorization request — a URL built without a
`code_challenge` will be rejected by X. The shared initiation endpoint
always supplies an S256 challenge.

Deliberately does NOT request the `offline.access` scope: `verify` never
refreshes tokens — the two-hour access token is used exactly once to fetch
the user's profile.

```typescript
function getAuthorizeUrl({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}: OAuthAuthorizeUrlParams): string | null
```

- `params` — State, PKCE challenge, and optional redirect URI.

**Returns:** The X authorize URL, or `null` when `OAUTH_TWITTER_CLIENT_ID` is unset.

#### `verify(code, codeVerifier, redirectUri)`

Verifies a Twitter OAuth code and responds with OAuth-related user props.

The token and user-info URLs default to api.twitter.com, but can be
overridden via `OAUTH_TWITTER_TOKEN_URL` and `OAUTH_TWITTER_USER_URL`
(pairing with `OAUTH_TWITTER_AUTHORIZE_URL` for E2E mock OAuth servers,
consistent with the github/gitlab/google bonds).

```typescript
function verify(code: string, codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; emailVerified: false; oauthServer: "twitter"; oauthId: string; oauthData: Record<string, unknown>; } | null>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used).
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** An `OAuthUserInfo` with the user's Twitter username, email, and OAuth ID.

### Constants

#### `oauthTwitterSecretDefinitions`

Secret definitions required by the X (Twitter) OAuth bond.

```typescript
const oauthTwitterSecretDefinitions: SecretDefinition[]
```

#### `serverName`

The OAuth server identifier for Twitter.

```typescript
const serverName: "twitter"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { serverName, verify, getAuthorizeUrl } from '@molecule/api-oauth-twitter'

export function setupOauthTwitter(): void {
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

- `OAUTH_TWITTER_CLIENT_ID` *(required)* — X (Twitter) OAuth client ID
  - Setup: Create a project + app in the X developer portal, enable OAuth 2.0, and copy the client ID.
  - Get it here: [https://developer.x.com/en/portal/dashboard](https://developer.x.com/en/portal/dashboard)
- `OAUTH_TWITTER_CLIENT_SECRET` *(required)* — X (Twitter) OAuth client secret
  - Setup: Shown when enabling OAuth 2.0 for your app in the X developer portal.
  - Get it here: [https://developer.x.com/en/portal/dashboard](https://developer.x.com/en/portal/dashboard)

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-http`
- `@molecule/api-oauth`
- `@molecule/api-secrets`

The token exchange (`verify`'s call to X's token endpoint) is
`application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 and X's own docs —
matching every other molecule.dev OAuth bond (google, gitlab, github,
apple, microsoft).
