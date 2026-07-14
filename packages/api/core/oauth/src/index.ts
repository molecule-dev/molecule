/**
 * OAuth core interface for molecule.dev.
 *
 * Defines the standard interface for OAuth providers.
 *
 * @remarks
 * The OAuth authorization-code flow has security steps a weak integration skips — these
 * are MANDATORY (the per-type docs carry the details):
 *
 * - **`state` is CSRF protection, not optional.** On initiation, generate a random
 *   `state`, store it in an httpOnly cookie, and put it on the authorize URL
 *   ({@link OAuthAuthorizeUrlParams.state}). On callback, reject unless the returned
 *   `state` matches the cookie — no state check is a login-CSRF / account-takeover hole.
 * - **Use PKCE** ({@link OAuthAuthorizeUrlParams.codeChallenge}, method `'S256'`): derive a
 *   per-session code verifier, send its challenge on initiation, pass the verifier to
 *   {@link OAuthVerifier} on callback.
 * - **The code exchange is SERVER-SIDE.** {@link OAuthVerifier}`(code, …)` runs in your API
 *   and returns {@link OAuthUserProps} (or `null`). The OAuth **client secret** lives only
 *   in the API — never ship it to the browser; the browser only gets the authorize URL and
 *   returns the `code`.
 * - **Trust only `emailVerified === true`.** A provider email whose
 *   {@link OAuthUserProps.emailVerified} is not explicitly `true` MUST NOT take over an
 *   existing local account (squatter protection).
 *
 * `@molecule/api-resource-user`'s `logInOAuth` already implements this flow correctly —
 * prefer wiring a provider bond into it over hand-rolling the endpoints.
 *
 * @example
 * ```ts
 * // Initiation: GET /users/oauth/:provider → 302 to the provider.
 * router.get('/oauth/:provider', (req, res) => {
 *   const state = randomToken()
 *   const { challenge, verifier } = pkce() // S256
 *   res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax' })
 *   res.cookie('oauth_verifier', verifier, { httpOnly: true, sameSite: 'lax' })
 *   const url = buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: 'S256' })
 *   if (!url) return res.status(404).json({ error: 'Provider not configured.' })
 *   res.redirect(url)
 * })
 *
 * // Callback: verify state FIRST, then exchange the code SERVER-SIDE.
 * router.get('/oauth/:provider/callback', async (req, res) => {
 *   if (!req.query.state || req.query.state !== req.cookies.oauth_state) {
 *     return res.status(403).json({ error: 'Invalid state.' }) // CSRF guard
 *   }
 *   const props = await verifyOAuthCode(String(req.query.code), req.cookies.oauth_verifier)
 *   if (!props) return res.status(401).json({ error: 'OAuth verification failed.' })
 *   // props.emailVerified must be === true before trusting props.email over a local account.
 *   await logInOrLink(res, props)
 * })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './types.js'
