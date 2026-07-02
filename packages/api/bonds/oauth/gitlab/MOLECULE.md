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

#### `verify(code, codeVerifier, redirectUri)`

Verifies a GitLab OAuth code and responds with OAuth-related user props.

```typescript
function verify(code: string, codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; emailVerified: boolean; oauthServer: "gitlab"; oauthId: string; oauthData: Record<string, unknown>; }>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used).
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** An `OAuthUserInfo` with the user's GitLab username, email, and OAuth ID.

### Constants

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

### Environment Variables

- `OAUTH_GITLAB_CLIENT_ID` *(required)* — GitLab OAuth application ID
  - Setup: GitLab → User settings → Applications → Add new application with the {apiUrl}/api/users/log-in/oauth redirect URI.
  - Get it here: [https://gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
- `OAUTH_GITLAB_CLIENT_SECRET` *(required)* — GitLab OAuth secret
  - Setup: Shown when creating the application in GitLab.
  - Get it here: [https://gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
