/**
 * Express cookie parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setCookieParser, setCookieParserFactory } from '@molecule/api-middleware-cookie-parser'
 * import { provider, cookieParserFactory } from '@molecule/api-middleware-cookie-parser-express'
 *
 * setCookieParser(provider)
 * setCookieParserFactory(cookieParserFactory)
 * ```
 *
 * @remarks
 * - **Wire BOTH setters** (as in the example) — wiring only the factory leaves
 *   the core `cookieParser` middleware throwing "not configured".
 * - The default `provider` parses UNSIGNED cookies into `req.cookies` only.
 *   For signed cookies, register `cookieParserFactory` and create the
 *   middleware with a secret — verified values then land on
 *   `req.signedCookies` (tampered ones become `false`), while unsigned
 *   cookies remain on `req.cookies`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
