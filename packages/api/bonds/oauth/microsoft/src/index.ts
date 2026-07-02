/**
 * Microsoft Identity Platform OAuth provider for molecule.dev.
 *
 * Implements the `@molecule/api-oauth` contract (`serverName` + `verify`)
 * for compatibility with the existing OAuth bond wiring, plus a richer
 * `OAuthProvider` surface (`getAuthorizationUrl`,
 * `exchangeCodeForTokens`, `getUserInfo`, `refreshAccessToken`,
 * `verifyIdToken`) for apps that need OpenID Connect, refresh-token
 * rotation, or Microsoft Graph access (Outlook, OneDrive, Teams).
 *
 * ## Setup
 *
 * 1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/).
 *
 * 2. Navigate to **Applications → App registrations → New registration**.
 *
 *     - Choose **Accounts in any organizational directory and personal
 *       Microsoft accounts** for multi-tenant + consumer login (matches
 *       the default `OAUTH_MICROSOFT_TENANT_ID=common`). For
 *       single-tenant apps, choose **Accounts in this organizational
 *       directory only** and set `OAUTH_MICROSOFT_TENANT_ID` to the
 *       directory tenant id.
 *     - Add a **Web** redirect URI matching your app origin
 *       (e.g., `http://localhost:3000` for development, your production
 *       origin otherwise — must match the `redirectUri` passed to
 *       `getAuthorizationUrl` and `exchangeCodeForTokens`).
 *
 * 3. After registration:
 *
 *     - Copy the **Application (client) ID** to your API's
 *       `OAUTH_MICROSOFT_CLIENT_ID` and your app's
 *       `REACT_APP_OAUTH_MICROSOFT_CLIENT_ID` environment variables.
 *
 *     - Open **Certificates & secrets → Client secrets → New client
 *       secret**, then copy the secret value (NOT the secret id) to
 *       your API's `OAUTH_MICROSOFT_CLIENT_SECRET` environment variable.
 *
 *     - For single-tenant apps, also set
 *       `OAUTH_MICROSOFT_TENANT_ID` to the directory tenant id.
 *
 * 4. Under **API permissions**, add the delegated Microsoft Graph
 *    permissions you need. The defaults granted by the
 *    `openid email profile User.Read` scope suffice for sign-in.
 *
 * 5. Restart your API and/or rebuild your app so they pick up the
 *    environment variables.
 *
 * > **Your users should now be able to log in via Microsoft!**
 *
 * @remarks
 * **ID-token issuer / tenant validation contract.** `verifyMicrosoftIdToken`
 * (and `provider.verifyIdToken`) validate `iss` against the issuer(s) implied
 * by the *configured* tenant (`OAUTH_MICROSOFT_TENANT_ID` / `config.tenantId`)
 * — never against the token's own `tid`. This matters because Microsoft's
 * public-cloud signing keys are **shared across every tenant**, so a
 * validly-signed token issued for a *different* directory would otherwise
 * satisfy a single-tenant configuration (a cross-tenant authentication
 * bypass). The rule:
 *
 * - **Concrete tenant GUID configured (single-tenant pin):** the accepted
 *   issuer is fixed to that exact tenant, and the token's `tid` must equal the
 *   configured tenant. A token's self-asserted `tid` can NOT widen the
 *   accepted issuer set.
 * - **`common` / `organizations` / `consumers` (multi-tenant):** any
 *   directory's users may sign in by design, so the token's `tid`-derived
 *   `https://login.microsoftonline.com/{tid}/v2.0` issuer IS accepted — this
 *   is the documented multi-tenant contract, not a widening of a pin.
 *
 * Pin to a single tenant by setting `OAUTH_MICROSOFT_TENANT_ID` to the
 * directory GUID; leave it `common` only when multi-tenant sign-in is
 * intended.
 *
 * @example
 * ```ts
 * import { bond } from '@molecule/api-bond'
 * import * as microsoft from '@molecule/api-oauth-microsoft'
 *
 * bond('oauth', microsoft.serverName, microsoft)
 * ```
 *
 * @module
 */

export * from './jwks.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
