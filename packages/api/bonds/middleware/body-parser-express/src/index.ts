/**
 * Express body parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
 * import { provider, jsonParserFactory } from '@molecule/api-middleware-body-parser-express'
 *
 * setBodyParser(provider)
 * setJsonParserFactory(jsonParserFactory)
 * ```
 *
 * @remarks
 * - **Wire BOTH setters** (as in the example): `setBodyParser(provider)`
 *   registers the parser the core `bodyParser` middleware delegates to —
 *   wiring only the factory leaves `getBodyParser()` throwing on the first
 *   request.
 * - JSON bodies are capped at **2 MB** (413 beyond it). For larger payloads
 *   create a custom parser via `setJsonParserFactory(jsonParserFactory)` +
 *   `createJsonParser({ limit: '10mb' })` from the core.
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
