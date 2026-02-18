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

#### `OAuthVerifier`

Exchanges an OAuth authorization code for user profile information.

Implementations call the provider's token and user-info endpoints,
then return normalized `OAuthUserProps` for account creation or login.

```typescript
type OAuthVerifier = (
  code: string,
  codeVerifier?: string,
  redirectUri?: string,
) => Promise<OAuthUserProps>
```

## Available Providers

| Provider | Package |
|----------|---------|
| GitHub OAuth | `@molecule/api-oauth-github` |
| GitLab OAuth | `@molecule/api-oauth-gitlab` |
| Google OAuth | `@molecule/api-oauth-google` |
| Twitter OAuth | `@molecule/api-oauth-twitter` |
