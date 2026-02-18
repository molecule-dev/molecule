# @molecule/api-oauth-github

GitHub OAuth provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-oauth-github
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

#### `verify(code, codeVerifier)`

Exchanges a GitHub OAuth authorization code for an access token, then
fetches the authenticated user's profile from the GitHub API.

```typescript
function verify(code: string, codeVerifier?: string): Promise<{ username: string; email: string | undefined; oauthServer: "github"; oauthId: string; oauthData: Record<string, unknown>; }>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used in the auth request).

**Returns:** An `OAuthUserInfo` with the user's GitHub username, email, and OAuth ID.

### Constants

#### `serverName`

The OAuth server identifier for GitHub.

```typescript
const serverName: "github"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-http` ^1.0.0
- `@molecule/api-oauth` ^1.0.0

### Environment Variables

- `OAUTH_GITHUB_CLIENT_ID` *(required)*
- `OAUTH_GITHUB_CLIENT_SECRET` *(required)*
