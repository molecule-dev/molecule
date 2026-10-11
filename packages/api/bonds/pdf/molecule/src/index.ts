/**
 * molecule.dev hosted PDF provider for `@molecule/api-pdf`.
 *
 * Render HTML to PDF, merge PDFs and watermark PDFs on molecule.dev —
 * billed to your molecule project, no vendor account, molecule-operated
 * renderers. It is an ordinary bond: swap it for
 * `@molecule/api-pdf-puppeteer` (in-process headless Chrome) or
 * `@molecule/api-pdf-pdfkit` without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, fromHTML } from '@molecule/api-pdf'
 * import { provider as pdf } from '@molecule/api-pdf-molecule'
 *
 * setProvider(pdf) // reads MOLECULE_API_KEY from the environment
 *
 * const bytes = await fromHTML('<h1>Invoice</h1><p>Total: €42.00</p>')
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:pdf`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Limits mirrored locally: 2,000,000 characters of HTML, 8 MB per PDF,
 *   20 documents / 24 MB per merge — oversized calls are refused with 413 and
 *   never leave the process.
 * - **Each core method is ONE hosted round trip**: `fromHTML`, `merge` and
 *   `addWatermark` call the service; every response also carries the result's
 *   page count (read it via the raw `render()` when you need it).
 * - `fromTemplate` is NOT hosted — interpolating values into a template is
 *   string work the caller does in its own code (HTML-ESCAPE every
 *   interpolated value: the renderer fetches what the markup names), then
 *   call `fromHTML`.
 * - `getPageCount` and `getMetadata` are LOCAL pdf-lib parses of the bytes
 *   you pass in — no network call, no service billing.
 * - The hosted renderer fetches HTTP(S) subresources (images, fonts, CSS)
 *   from PUBLIC addresses only; loopback, private-network and link-local
 *   targets are refused server-side. `file:` URLs are never read.
 * - Metered per document and billed to the project; the upstream is
 *   molecule's own infrastructure, so the real cost is 0 — requests still
 *   count against the project's rate limit and free-tier allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried. The default timeout is 60 s — headless-Chrome rendering takes a
 *   moment.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { PDFProvider } from '@molecule/api-pdf'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: PDFProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: PDFProvider = new Proxy({} as PDFProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
