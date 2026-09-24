/**
 * Twitter OAuth provider for molecule.dev.
 *
 * ## Setup
 *
 * 1. Log into [Twitter](https://twitter.com) (or sign up).
 *
 * 2. Open the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).
 *
 * 3. Create a new project/app and follow Twitter's steps. You may need to verify your account with a phone number.
 *
 * 4. Fill out your app's information and you should eventually arrive at a screen with an ID, secret, and bearer token. These are not the OAuth client ID and secret, but you should still store them somewhere safe.
 *
 * 5. Upload your app's logo and description if necessary.
 *
 *     5.1. Return to Twitter's Developer Portal Dashboard.
 *
 *     5.2. Open your app under "Projects & Apps".
 *
 *     5.3. Click the "Edit" button.
 *
 *     5.4. Upload an image.
 *
 *     5.5. Update your app's description.
 *
 *     5.6. Click the "Save" button.
 *
 * 6. Under "User authentication settings", click the "Set up" button to begin enabling OAuth.
 *
 * 7. Enable "OAuth 2.0".
 *
 * 8. Choose "Web App" for "Type of App".
 *
 * 9. Under "Callback URI / Redirect URL", add entries for BOTH your app origin and each page your app starts OAuth from (X matches these exactly, and the API sends `redirect_uri = APP_ORIGIN + the initiating page's path`):
 *
 *     - For development: `http://localhost:3000` and `http://localhost:3000/login`
 *
 *     - For production: your app's origin (typically your API's `APP_ORIGIN` environment variable) and the same origin + `/login` (plus any other OAuth-initiating page paths).
 *
 * 10. Fill out the remaining information as necessary and click the "Save" button.
 *
 * 11. You should be taken to a screen containing your OAuth client ID and secret.
 *
 *     11.1. Set the client ID to your API's `OAUTH_TWITTER_CLIENT_ID` environment variable.
 *
 *     11.2. Set the client secret to your API's `OAUTH_TWITTER_CLIENT_SECRET` environment variable.
 *
 * 12. Restart your API and/or rebuild your app so that they have the environment variables.
 *
 * > **Your users should now be able to log in via Twitter!**
 *
 * @example
 * ```typescript
 * import { createHash, randomBytes } from 'node:crypto'
 *
 * import { bond } from '@molecule/api-bond'
 * import type { OAuthProviderConfig } from '@molecule/api-oauth'
 * import { getAuthorizeUrl, serverName, verify } from '@molecule/api-oauth-twitter'
 *
 * // Startup: bond NAMED by serverName ('twitter'). Env: OAUTH_TWITTER_CLIENT_ID,
 * // OAUTH_TWITTER_CLIENT_SECRET (server only), APP_ORIGIN.
 * const twitter: OAuthProviderConfig = { serverName, verify, getAuthorizeUrl }
 * bond('oauth', serverName, twitter)
 *
 * // Initiation: X REQUIRES PKCE — fresh state + verifier per request (httpOnly cookies).
 * const state = randomBytes(32).toString('hex')
 * const codeVerifier = randomBytes(32).toString('base64url')
 * const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
 * const redirectUri = process.env.APP_ORIGIN ?? 'https://app.example.com'
 * const authorizeUrl = getAuthorizeUrl({ state, codeChallenge, codeChallengeMethod: 'S256', redirectUri })
 * // → 302 the browser to authorizeUrl; null means OAUTH_TWITTER_CLIENT_ID is unset.
 *
 * // Callback (after checking the returned state equals the cookie): pass the SAME verifier.
 * const user = await verify('code-from-callback-query', codeVerifier, redirectUri)
 * // user: { username: 'ada@twitter', email: undefined, emailVerified: false, oauthId: X user id }
 * // null → X rejected the code (respond 403); a throw → network/config failure.
 * console.log(authorizeUrl, user?.username)
 * ```
 *
 * @remarks
 * - **Bond it NAMED: `bond('oauth', serverName, { serverName, verify,
 *   getAuthorizeUrl })`** — there is no `setProvider` and no default export.
 * - **PKCE is mandatory on X**: always send `codeChallenge` in the authorize
 *   URL and the matching `codeVerifier` to `verify()`, or the exchange fails.
 *   The client secret goes in an HTTP Basic header (confidential client).
 * - **No email.** Scopes are fixed to `users.read tweet.read`, so `email` is
 *   normally `undefined` and `emailVerified` is ALWAYS `false` — key accounts
 *   on `oauthServer` + `oauthId`, never on email.
 * - `verify()` returns `null` for a rejected/expired code (`invalid_grant`);
 *   other failures throw. Mock servers: override
 *   `OAUTH_TWITTER_AUTHORIZE_URL`, `OAUTH_TWITTER_TOKEN_URL`,
 *   `OAUTH_TWITTER_USER_URL`.
 * - The token exchange (`verify`'s call to X's token endpoint) is
 * `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 and X's own docs —
 * matching every other molecule.dev OAuth bond (google, gitlab, github,
 * apple, microsoft).
 *
 * @module
 */

export * from './authorize.js'
export * from './browser-guard.js'
export * from './secrets.js'
export * from './types.js'
export * from './verify.js'
