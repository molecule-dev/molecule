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
npm install @molecule/api-oauth-google
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

#### `verify(code, codeVerifier, redirectUri)`

Verifies a Google OAuth code and responds with OAuth-related user props.

```typescript
function verify(code: string, codeVerifier?: string, redirectUri?: string): Promise<{ username: string; email: string | undefined; oauthServer: "google"; oauthId: string; oauthData: Record<string, unknown>; }>
```

- `code` — The authorization code from the OAuth callback.
- `codeVerifier` — The PKCE code verifier (if PKCE was used).
- `redirectUri` — The redirect URI used in the authorization request.

**Returns:** An `OAuthUserInfo` with the user's Google email/sub, and OAuth ID.

### Constants

#### `serverName`

The OAuth server identifier for Google.

```typescript
const serverName: "google"
```

## Core Interface
Implements `@molecule/api-oauth` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-oauth` ^1.0.0

### Environment Variables

- `OAUTH_GOOGLE_CLIENT_ID` *(required)*
- `OAUTH_GOOGLE_CLIENT_SECRET` *(required)*
