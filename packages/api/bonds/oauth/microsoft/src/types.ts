/**
 * Microsoft OAuth types for molecule.dev.
 *
 * @module
 */

export type { OAuthUserProps, OAuthVerifier } from '@molecule/api-oauth'

/**
 * Normalized user info returned by OAuth providers.
 *
 * Matches the shape used across bonds — id/email/name/picture — derived
 * from `OAuthUserProps` so consumers do not need provider-specific shapes.
 */
export interface OAuthUserInfo {
  /** Unique identifier from the provider. */
  id: string
  /** User's email address, when available. */
  email?: string
  /** User's display name, when available. */
  name?: string
  /** URL of the user's profile picture, when available. */
  picture?: string
}

/**
 * Optional configuration for the Microsoft OAuth provider.
 *
 * `tenantId` overrides the path segment in Microsoft endpoints. Defaults
 * to `"common"` (multi-tenant + personal accounts). For single-tenant
 * apps, pass the directory tenant GUID.
 */
export interface MicrosoftOAuthConfig {
  /**
   * Microsoft tenant identifier. Defaults to `"common"`.
   *
   * Common values: `"common"`, `"organizations"`, `"consumers"`, or a
   * tenant GUID such as `"00000000-0000-0000-0000-000000000000"`.
   */
  tenantId?: string

  /** Override OAuth client ID. Defaults to `process.env.OAUTH_MICROSOFT_CLIENT_ID`. */
  clientId?: string

  /** Override OAuth client secret. Defaults to `process.env.OAUTH_MICROSOFT_CLIENT_SECRET`. */
  clientSecret?: string

  /**
   * Default OAuth scopes when none are passed to `getAuthorizationUrl`.
   * Defaults to `'openid email profile User.Read'`.
   */
  defaultScope?: string
}

/**
 * Token response from the Microsoft `/token` endpoint.
 *
 * Microsoft rotates refresh tokens — always persist whatever
 * `refresh_token` value is returned, replacing the previous one.
 */
export interface MicrosoftTokenSet {
  /** Bearer access token used for Microsoft Graph requests. */
  accessToken: string
  /** OpenID Connect ID token (JWT) for `verifyIdToken`. */
  idToken?: string
  /** Refresh token (rotated by Microsoft on every refresh). */
  refreshToken?: string
  /** Token type (typically `"Bearer"`). */
  tokenType: string
  /** Lifetime of `accessToken` in seconds, when reported. */
  expiresIn?: number
  /** Granted scope string (space-delimited). */
  scope?: string
}

/**
 * Verified ID token claims returned by `verifyIdToken`.
 *
 * Only the validated subset of OpenID claims is exposed — the full raw
 * payload is included as `claims` for callers that need additional
 * fields, but only after signature/issuer/audience/expiry checks pass.
 */
export interface MicrosoftIdTokenClaims {
  /** Subject identifier (Microsoft user object id). */
  sub: string
  /** Issuer URL. */
  iss: string
  /** Audience (the OAuth client ID). */
  aud: string
  /** Expiry (epoch seconds). */
  exp: number
  /** Issued-at (epoch seconds). */
  iat: number
  /** Email address, when present. */
  email?: string
  /** Preferred username (often the UPN), when present. */
  preferred_username?: string
  /** Display name, when present. */
  name?: string
  /** Tenant id from the token. */
  tid?: string
  /** Object id from the token. */
  oid?: string
  /** Full validated payload for additional non-standard claims. */
  claims: Record<string, unknown>
}

/**
 * Microsoft Identity Platform OAuth provider surface.
 *
 * Higher-level than the core `OAuthVerifier` contract — exposes the full
 * OAuth 2.0 / OpenID Connect lifecycle (auth URL, token exchange,
 * refresh, id-token verification) needed by apps that integrate Outlook,
 * OneDrive, Teams, or any Graph API.
 */
export interface OAuthProvider {
  /** OAuth server identifier (`"microsoft"`). */
  readonly serverName: string

  /**
   * Build the authorization URL the user is redirected to.
   * @param params - Authorization request parameters.
   * @returns Fully-qualified URL to begin the OAuth flow.
   */
  getAuthorizationUrl(params: { state: string; redirectUri: string; scope?: string }): string

  /**
   * Exchange an authorization code for an access/id/refresh token set.
   * @param code - Authorization code returned by Microsoft.
   * @param redirectUri - Redirect URI matching the authorization request.
   * @returns The token set.
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<MicrosoftTokenSet>

  /**
   * Fetch normalized user info from Microsoft Graph (`/v1.0/me`).
   * @param accessToken - Access token previously obtained.
   * @returns Normalized user info.
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>

  /**
   * Use a refresh token to obtain a fresh access/id/refresh token set.
   *
   * Microsoft rotates refresh tokens — the returned token set's
   * `refreshToken` (when present) supersedes the input token.
   * @param refreshToken - Existing refresh token.
   * @returns New token set.
   */
  refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenSet>

  /**
   * Verify a Microsoft-issued ID token (RS256), validating signature
   * via JWKS plus `iss`, `aud`, and `exp` claims.
   *
   * JWKS is fetched from the discovery endpoint and cached in memory
   * for one hour.
   *
   * @param idToken - The compact JWS string to verify.
   * @returns Validated claims.
   */
  verifyIdToken(idToken: string): Promise<MicrosoftIdTokenClaims>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Microsoft OAuth (Azure AD / Entra ID) client ID.
       *
       * @see https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
       */
      OAUTH_MICROSOFT_CLIENT_ID?: string

      /**
       * The Microsoft OAuth client secret.
       *
       * @see https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
       */
      OAUTH_MICROSOFT_CLIENT_SECRET?: string

      /**
       * Microsoft tenant identifier. Defaults to `"common"`.
       *
       * Use `"common"` for multi-tenant + personal accounts,
       * `"organizations"` for any Azure AD tenant, `"consumers"` for
       * personal Microsoft accounts only, or a tenant GUID for
       * single-tenant apps.
       */
      OAUTH_MICROSOFT_TENANT_ID?: string

      /**
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string
    }
  }
}
