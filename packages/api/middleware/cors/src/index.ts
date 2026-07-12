/**
 * CORS middleware for molecule.dev.
 *
 * @remarks
 * CORS decides which browser ORIGINS may call your API (with credentials). Configure an
 * explicit allowlist from env (`APP_ORIGIN` / `SITE_ORIGIN`) via {@link CorsOptions}`.origin`
 * — don't hand-roll `Access-Control-*` headers.
 *
 * - **`origin: '*'` with `credentials: true` is invalid AND insecure.** The browser rejects a
 *   wildcard on a credentialed (cookie / `Authorization`) request, and reflecting arbitrary
 *   origins with credentials is a CSRF / data-exfiltration hole. For an app that sends the
 *   session cookie or a bearer token, set a SPECIFIC origin allowlist + `credentials: true`.
 * - **Never "fix" a CORS error by reflecting the request origin unconditionally.** That
 *   disables the protection entirely — add the real origin to the allowlist (env) instead.
 * - **A permissive dev CORS config must NOT ship to production.** Loosen only for local dev,
 *   behind a dev-only guard; prod stays on the strict allowlist. (Molecule's preview CORS
 *   proxy is dev-only and never ships — mirror that discipline.)
 *
 * @example
 * ```ts
 * import { createCorsMiddleware } from '@molecule/api-middleware-cors'
 * // Explicit allowlist from env; credentials on for cookie/bearer auth.
 * app.use(createCorsMiddleware({
 *   origin: [process.env.APP_ORIGIN, process.env.SITE_ORIGIN].filter(Boolean),
 *   credentials: true,
 * }))
 * ```
 *
 * @module
 */

export * from './cors.js'
export * from './types.js'
