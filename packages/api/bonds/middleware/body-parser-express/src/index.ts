/**
 * Express body parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import {
 *   setBodyParser,
 *   setJsonParserFactory,
 *   setUploadParserFactory,
 * } from '@molecule/api-middleware-body-parser'
 * import {
 *   jsonParserFactory,
 *   provider,
 *   uploadParserFactory,
 * } from '@molecule/api-middleware-body-parser-express'
 *
 * setBodyParser(provider)
 * setJsonParserFactory(jsonParserFactory)
 * setUploadParserFactory(uploadParserFactory)
 * ```
 *
 * @remarks
 * - **Wire all three setters** (as in the example): `setBodyParser(provider)`
 *   registers the parser the core `bodyParser` middleware delegates to —
 *   wiring only the factories leaves `getBodyParser()` throwing on the first
 *   request — and `setUploadParserFactory` is what `receiveUploads()` from
 *   `@molecule/api-uploads` runs.
 * - JSON bodies are capped at **2 MB** (413 beyond it). For larger payloads
 *   create a custom parser via `setJsonParserFactory(jsonParserFactory)` +
 *   `createJsonParser({ limit: '10mb' })` from the core.
 * - `application/x-www-form-urlencoded` is parsed by busboy, and **each field
 *   value is JSON-parsed when possible** (`"123"` → number `123`, `"true"` →
 *   `true`; invalid JSON stays a string). A body is refused with 413 rather
 *   than passed on cut short: a field over 1 MiB, more than the 2 MB of all
 *   fields together, or more than 100 fields.
 * - **A `multipart/form-data` body is not read app-wide.** Only the route's
 *   upload parser reads it (`receiveUploads()`), which streams the files to
 *   the bonded uploads provider with that route's limits; its text fields
 *   become `req.body` as strings. So an upload route works wherever it is
 *   mounted, before or after this parser. When the route then answers with a
 *   status of 400 or more, the parser removes the files it stored; a client
 *   that goes away before the answer keeps them.
 * - `req.body` is `{}` when no parser read the request (multipart, `text/plain`
 *   or no body).
 * - `req.rawBody` (a STRING copy of the unparsed body, for Stripe-style
 *   webhook signature verification) is set only on the JSON path.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './upload-parser.js'
