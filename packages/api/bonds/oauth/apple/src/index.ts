/**
 * Sign in with Apple OAuth provider for molecule.dev.
 *
 * ## Setup
 *
 * 1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/).
 *
 * 2. In the [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
 *    console, create:
 *
 *    - An **App ID** with the *Sign in with Apple* capability enabled.
 *    - A **Services ID** whose identifier becomes your `OAUTH_APPLE_CLIENT_ID`.
 *      Configure its *Sign in with Apple* settings with your domain and the
 *      exact redirect URI(s) you will use (e.g. `https://yourapp.com/auth/apple/callback`).
 *    - A **Key** with *Sign in with Apple* enabled. Download the resulting
 *      `.p8` file once (Apple does not allow re-download). The 10-character
 *      Key ID becomes `OAUTH_APPLE_KEY_ID`; the file's contents become
 *      `OAUTH_APPLE_PRIVATE_KEY`.
 *
 * 3. Locate your **Team ID** at the top right of the developer console;
 *    set it to `OAUTH_APPLE_TEAM_ID`.
 *
 * 4. Configure your API environment:
 *
 *    - `OAUTH_APPLE_CLIENT_ID` — the Services ID
 *    - `OAUTH_APPLE_TEAM_ID` — your Apple Developer Team ID
 *    - `OAUTH_APPLE_KEY_ID` — the 10-character Key ID
 *    - `OAUTH_APPLE_PRIVATE_KEY` — the PKCS8 PEM contents of the `.p8` file
 *      (newlines may be encoded as `\n`)
 *
 * 5. Restart your API so it picks up the environment variables.
 *
 * > **Your users should now be able to log in via Apple!**
 *
 * @example
 * ```typescript
 * // npm install @molecule/api-oauth-apple --workspace=api
 * // Env: OAUTH_APPLE_CLIENT_ID (the Services ID), OAUTH_APPLE_TEAM_ID,
 * // OAUTH_APPLE_KEY_ID, OAUTH_APPLE_PRIVATE_KEY (.p8 contents) — server-only.
 * import { bond } from '@molecule/api-bond'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-apple'
 *
 * // api/src/bonds/oauth-apple.ts, called from setupBonds() — the `oauth`
 * // category is NAMED: providers coexist, and the bond name IS the
 * // serverName ('apple').
 * bond('oauth', serverName, { serverName, verify, getAuthorizeUrl })
 *
 * // Redirect: register the exact redirect URI(s) the app will use on the
 * // Services ID; the login button just links to GET /users/oauth/apple.
 * ```
 *
 * @module
 */

export * from './authorize.js'
export * from './browser-guard.js'
export * from './client-secret.js'
export * from './jwks.js'
export * from './secrets.js'
export * from './tokens.js'
export * from './types.js'
export * from './verify.js'
export * from './verify-id-token.js'
