/**
 * Express body parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import {
 *   bodyParser,
 *   createJsonParser,
 *   setBodyParser,
 *   setJsonParserFactory,
 * } from '@molecule/api-middleware-body-parser'
 * import { jsonParserFactory, provider } from '@molecule/api-middleware-body-parser-express'
 *
 * // Startup: wire BOTH setters before mounting any parser.
 * setBodyParser(provider)
 * setJsonParserFactory(jsonParserFactory)
 *
 * const app = express()
 *
 * // A route that needs a bigger body gets its own parser, mounted BEFORE the global one.
 * app.post('/api/imports', createJsonParser({ limit: '10mb' }), (req, res) => {
 *   res.json({ rows: Array.isArray(req.body.rows) ? req.body.rows.length : 0 })
 * })
 *
 * // Global parser: JSON (2 MB cap) and urlencoded/multipart FIELDS → req.body.
 * app.use(bodyParser)
 * app.post('/api/items', (req, res) => {
 *   res.status(201).json({ item: req.body, rawBody: req.rawBody ?? null })
 * })
 *
 * app.listen(Number(process.env.PORT ?? 4000))
 * // POST /api/items  {"name":"Desk"}     → 201 {"item":{"name":"Desk"},"rawBody":"{\"name\":\"Desk\"}"}
 * // POST /api/items  qty=3&active=true   → 201 {"item":{"qty":3,"active":true},"rawBody":null}
 * ```
 *
 * @remarks
 * - **Wire BOTH setters** (as in the example): `setBodyParser(provider)`
 *   registers the parser the core `bodyParser` middleware delegates to —
 *   wiring only the factory leaves `getBodyParser()` throwing on the first
 *   request.
 * - JSON bodies are capped at **2 MB** (413 beyond it). For larger payloads
 *   mount `createJsonParser({ limit: '10mb' })` from the core on that route,
 *   BEFORE `app.use(bodyParser)` — once a body is parsed, later parsers skip it.
 * - Parsers only run for a matching `Content-Type`; a JSON request sent
 *   without `Content-Type: application/json` leaves `req.body` `undefined`.
 * - `multipart/form-data` and `application/x-www-form-urlencoded` are parsed
 *   by busboy: **file parts are skipped** (streams drained — use
 *   `@molecule/utilities-files` for uploads), and **each field value is
 *   JSON-parsed when possible** (`"123"` → number `123`, `"true"` → `true`;
 *   invalid JSON stays a string). Cumulative field bytes are capped at 2 MB
 *   (413).
 * - `req.rawBody` (a STRING copy of the unparsed body, for Stripe-style
 *   webhook signature verification) is set only on the JSON path — multipart
 *   requests never get it.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
