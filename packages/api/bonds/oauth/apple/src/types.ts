/**
 * Apple OAuth (Sign in with Apple) types for molecule.dev.
 *
 * @module
 */

export type { OAuthUserProps, OAuthVerifier } from '@molecule/api-oauth'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Apple OAuth Services ID (used as `client_id` and `aud` for ID-token verification).
       *
       * @see https://developer.apple.com/sign-in-with-apple/get-started/
       */
      OAUTH_APPLE_CLIENT_ID?: string

      /**
       * The Apple Developer Team ID — used as the `iss` claim of the
       * ES256 client-secret JWT.
       */
      OAUTH_APPLE_TEAM_ID?: string

      /**
       * The 10-character Apple Key ID identifying the private key used to
       * sign the client-secret JWT (the `kid` JWT header value).
       */
      OAUTH_APPLE_KEY_ID?: string

      /**
       * The PKCS8-encoded PEM private key (`.p8` contents) used to sign
       * the ES256 client-secret JWT. Newlines may be encoded as `\n`.
       */
      OAUTH_APPLE_PRIVATE_KEY?: string

      /**
       * The app origin for OAuth redirect.
       */
      APP_ORIGIN?: string
    }
  }
}

/**
 * The decoded payload of an Apple ID token (a JWT issued by Apple at
 * `https://appleid.apple.com`). Apple does not expose a userinfo endpoint —
 * the ID token *is* the user info.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple
 */
export interface AppleIdTokenClaims {
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

/**
 * Tokens returned by Apple's `/auth/token` endpoint.
 */
export interface AppleTokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token?: string
  token_type: string
}

/**
 * Options for {@link getAuthorizationUrl}.
 */
export interface AppleAuthorizationUrlOptions {
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
