/**
 * Google OAuth provider for molecule.dev.
 *
 * ## Setup
 *
 * 1. Log into [Google](https://google.com) (or sign up).
 *
 * 2. Open the [Google API Console](https://console.developers.google.com/) and create a new project if you do not already have one.
 *
 *     > If you're releasing your app on Google Play, you can use the "Google Play Console Developer" project automatically created by Google Play.
 *
 * 3. Configure your project's OAuth consent screen if you have not already.
 *
 *     3.1. Open the [OAuth consent screen page](https://console.cloud.google.com/apis/credentials/consent) for your project.
 *
 *     3.2. For most apps, choose the "External" option for "User Type".
 *
 *     3.3. Fill out your app information. Note that if you include a logo, you may have to go through a verification process with Google which can take 4 to 6 weeks.
 *
 *     3.4. At a minimum, add the `/auth/userinfo.email` and `/auth/userinfo.profile` scopes.
 *
 *     3.5. Add at least one test user. You can enter your current Google login's email address.
 *
 * 4. Open your project's [Credentials page](https://console.developers.google.com/apis/credentials).
 *
 * 5. Google may have already automatically created an "Web client" for you, found under the "OAuth 2.0 Client IDs" section. If not, you will need to create an OAuth client.
 *
 *     5a. If you already have an OAuth client you would like to use, view it by clicking the name. Your client credentials should be visible on the right.
 *
 *       - Copy the client ID and set it to your API's `OAUTH_GOOGLE_CLIENT_ID` environment variable.
 *
 *       - Copy the client secret and set it to your API's `OAUTH_GOOGLE_CLIENT_SECRET` environment variable.
 *
 *     5b. To create a new OAuth client, click "Create credentials" at the top and choose "OAuth client ID".
 *
 *       - Choose "Web application" for the application type.
 *
 *       - Enter the name of your Google OAuth client.
 *
 *       - For development, add `http://localhost:3000` to the "Authorized JavaScript origins", and add BOTH `http://localhost:3000` and `http://localhost:3000/login` (plus any other page your app starts OAuth from) to the "Authorized redirect URIs". Google matches redirect URIs exactly, and the API sends `redirect_uri = APP_ORIGIN + the initiating page's path` — a login started from `/login` redirects back to `http://localhost:3000/login`.
 *
 *       - For production, do the same with your app's origin (this should match your API's `APP_ORIGIN` environment variable): the origin as a JavaScript origin, and the origin + each OAuth-initiating page path as redirect URIs.
 *
 *       - Click "Create".
 *
 *       - Copy the client ID and set it to your API's `OAUTH_GOOGLE_CLIENT_ID` environment variable.
 *
 *       - Copy the client secret and set it to your API's `OAUTH_GOOGLE_CLIENT_SECRET` environment variable.
 *
 * 6. Restart your API and/or rebuild your app so that they have the environment variables.
 *
 * > **Your users should now be able to log in via Google!**
 *
 * @example
 * ```typescript
 * import { createHash, randomBytes } from 'node:crypto'
 *
 * import { bond } from '@molecule/api-bond'
 * import type { OAuthProviderConfig } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-google'
 *
 * // Startup: bond NAMED by serverName ('google'). Env: OAUTH_GOOGLE_CLIENT_ID,
 * // OAUTH_GOOGLE_CLIENT_SECRET (server only), APP_ORIGIN.
 * const google: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, google)
 *
 * // Initiation: fresh CSRF state + PKCE pair per request (keep both in httpOnly cookies).
 * const state = randomBytes(32).toString('hex')
 * const codeVerifier = randomBytes(32).toString('base64url')
 * const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
 * // Must EXACTLY match an "Authorized redirect URI" in the Google console.
 * const redirectUri = `${process.env.APP_ORIGIN ?? 'https://app.example.com'}/login`
 * const authorizeUrl = getAuthorizeUrl({ state, codeChallenge, codeChallengeMethod: 'S256', redirectUri })
 * // → 302 the browser to authorizeUrl; null means OAUTH_GOOGLE_CLIENT_ID is unset.
 *
 * // Callback (after checking the returned state equals the cookie): exchange server-side
 * // with the SAME redirectUri.
 * const user = await verify('code-from-callback-query', codeVerifier, redirectUri)
 * // user: { username: 'ada@example.com@google', email, emailVerified, oauthServer: 'google', oauthId: sub }
 * // null → Google rejected the code (invalid_grant → respond 403); a throw → network/config failure.
 * console.log(authorizeUrl, user?.emailVerified)
 * ```
 *
 * @remarks
 * - **Bond it NAMED: `bond('oauth', serverName, { serverName, verify,
 *   getAuthorizeUrl })`** — there is no `setProvider` and no default export.
 * - **`redirect_uri` must match EXACTLY** (Google compares the full string,
 *   path included) in the authorize URL, the console's authorized list and
 *   the `verify()` call. Mismatch → `redirect_uri_mismatch` on Google's page,
 *   or a thrown 400 from `verify()`.
 * - `verify()` returns `null` for `invalid_grant` (expired/reused code) —
 *   only other failures throw. Scopes are fixed to `openid email profile`;
 *   `oauthId` is Google's stable `sub`, `emailVerified` comes from Google's
 *   `email_verified`.
 * - Mock servers: override `OAUTH_GOOGLE_AUTHORIZE_URL`,
 *   `OAUTH_GOOGLE_TOKEN_URL`, `OAUTH_GOOGLE_USER_URL`.
 * - The token exchange (`verify`'s call to Google's token endpoint) is
 * `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 and Google's own
 * docs — matching every other molecule.dev OAuth bond (gitlab, twitter,
 * github, apple, microsoft).
 *
 * @module
 */

export * from './authorize.js'
export * from './browser-guard.js'
export * from './secrets.js'
export * from './types.js'
export * from './verify.js'
