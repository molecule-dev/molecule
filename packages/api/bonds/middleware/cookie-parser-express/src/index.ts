/**
 * Express cookie parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import {
 *   createCookieParserMiddleware,
 *   setCookieParser,
 *   setCookieParserFactory,
 * } from '@molecule/api-middleware-cookie-parser'
 * import {
 *   cookieParserFactory,
 *   provider,
 * } from '@molecule/api-middleware-cookie-parser-express'
 *
 * // Startup: wire BOTH setters before mounting.
 * setCookieParser(provider)
 * setCookieParserFactory(cookieParserFactory)
 *
 * const app = express()
 * // ONE cookie middleware. With a secret: unsigned → req.cookies, signed → req.signedCookies.
 * app.use(createCookieParserMiddleware(process.env.SESSION_SECRET))
 *
 * app.post('/api/login', (req, res) => {
 *   res.cookie('session', 'u_123', { signed: true, httpOnly: true, secure: true, sameSite: 'lax' })
 *   res.json({ ok: true })
 * })
 *
 * app.get('/api/me', (req, res) => {
 *   const userId = req.signedCookies.session // 'u_123', or false if tampered, undefined if absent
 *   res.json({ userId: userId || null, theme: req.cookies.theme ?? 'light' })
 * })
 *
 * app.listen(Number(process.env.PORT ?? 4000))
 * ```
 *
 * @remarks
 * - **Wire BOTH setters** (as in the example) — wiring only the factory leaves
 *   the core `cookieParser` middleware throwing "not configured". Mount ONE
 *   cookie middleware: the core `cookieParser` (unsigned only) OR
 *   `createCookieParserMiddleware(secret)` — not both.
 * - `res.cookie(name, value, { signed: true })` THROWS unless the mounted
 *   parser was created with a secret — set `SESSION_SECRET` (server-side only).
 * - This only PARSES incoming cookies. Setting them is express's `res.cookie()`;
 *   auth cookies need `httpOnly`, `secure` and `sameSite`.
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
