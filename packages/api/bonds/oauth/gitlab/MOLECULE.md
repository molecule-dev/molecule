# @molecule/api-oauth-gitlab

GitLab OAuth provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-gitlab
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

Builds the GitLab authorization URL for OAuth initiation
(`GET /users/oauth/:provider` 302s the browser here). Embeds this bond's
client id and scope (`read_user` — exactly what `verify`'s
`GET /api/v4/user` call requires) plus the caller's CSRF `state` and PKCE
S256 challenge, so no consumer hardcodes GitLab knowledge. The authorize
endpoint defaults to GitLab.com but can be overridden via
`OAUTH_GITLAB_AUTHORIZE_URL` for self-managed GitLab instances.

```typescript
function getAuthorizeUrl({
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}: OAuthAuthorizeUrlParams): string | null
```

- `params` — State, PKCE challenge, and optional redirect URI.

**Returns:** The GitLab authorize URL, or `null` when `OAUTH_GITLAB_CLIENT_ID` is unset.

#### `verify(code, codeVerifier, redirectUri)`

Verifies a GitLab OAuth code and responds with OAuth-related user props.

The token and user-info URLs default to GitLab.com, but can be overridden
via `OAUTH_GITLAB_TOKEN_URL` and `OAUTH_GITLAB_USER_URL` for self-managed
GitLab deployments or E2E mock servers.

```typescript
function verify(code: string, codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; emailVerified: boolean; oauthServer: "gitlab"; oauthId: string; oauthData: Record<string, unknown>; } | null>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used).
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** An `OAuthUserInfo` with the user's GitLab username, email, and OAuth ID.

### Constants

#### `oauthGitlabSecretDefinitions`

Secret definitions required by the GitLab OAuth bond.

```typescript
const oauthGitlabSecretDefinitions: SecretDefinition[]
```

#### `serverName`

The OAuth server identifier for GitLab.

```typescript
const serverName: "gitlab"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { serverName, verify } from '@molecule/api-oauth-gitlab'

export function setupOauthGitlab(): void {
  bond('oauth', serverName, { serverName, verify })
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

- `OAUTH_GITLAB_CLIENT_ID` *(required)* — GitLab OAuth application ID
  - Setup: GitLab → User settings → Applications → Add new application with the {apiUrl}/api/users/log-in/oauth redirect URI.
  - Get it here: [https://gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
- `OAUTH_GITLAB_CLIENT_SECRET` *(required)* — GitLab OAuth secret
  - Setup: Shown when creating the application in GitLab.
  - Get it here: [https://gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
