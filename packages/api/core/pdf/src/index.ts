/**
 * Provider-agnostic PDF generation and manipulation interface for molecule.dev.
 *
 * Defines the `PDFProvider` interface for generating PDFs from HTML or templates,
 * merging documents, adding watermarks, counting pages, and rendering pages as images.
 * Bond packages (Puppeteer, PDFKit, etc.) implement this interface. Application code
 * uses the convenience functions (`fromHTML`, `fromTemplate`, `merge`, `addWatermark`,
 * `getPageCount`, `getMetadata`, `toImages`) which delegate to the bonded provider.
 *
 * @remarks
 * - **Capabilities differ by bond — feature-detect before using the optional methods.**
 *   `getMetadata`/`toImages` are OPTIONAL on {@link PDFProvider}; the convenience functions
 *   THROW when the bonded provider doesn't implement them (e.g. the PDFKit bond has no
 *   `toImages`). Check `getProvider().toImages` before exposing a page-preview feature, or
 *   pick a bond that supports it.
 * - **`fromHTML` fidelity is provider-dependent.** Browser-engine bonds (Puppeteer) render
 *   full HTML/CSS; programmatic bonds (PDFKit) do a basic HTML-to-text approximation — do
 *   not expect styled output from a non-browser bond.
 * - Results are `Buffer`s: send them with a `Content-Type: application/pdf` response or
 *   store via the uploads package — never `JSON.stringify` a Buffer into an API payload,
 *   and avoid holding many large PDFs in memory at once.
 * - HTML assembled from user input is an injection surface — escape interpolated values
 *   before `fromHTML`, or a malicious string can forge/restyle document content.
 *
 * @example
 * ```typescript
 * import { setProvider, fromHTML, merge, getPageCount } from '@molecule/api-pdf'
 * import { provider as puppeteer } from '@molecule/api-pdf-puppeteer'
 *
 * setProvider(puppeteer)
 * const pdf = await fromHTML('<h1>Hello World</h1>', { format: 'A4', margin: { top: '1cm' } })
 * const pageCount = await getPageCount(pdf)
 * const merged = await merge([pdf, anotherPdf])
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual documents (invoice, report, receipt,
 * contract) and check every box off one by one. A box you can't check is an
 * integration bug to fix — not a skip:
 * - [ ] Every document the app generates has a working Download/Export control
 *   that returns a REAL PDF — not an HTML error page or a JSON-stringified
 *   Buffer. Inspect the actual response: `Content-Type` is `application/pdf`
 *   and the body's first bytes are the `%PDF` magic (hex `25 50 44 46`). Fetch
 *   the endpoint and check both — a body that starts with `<` or `{` is a
 *   failure dressed up as a download.
 * - [ ] Opening the downloaded PDF shows the record's real values (names, line
 *   items, dates, totals) — not placeholder/template text or a blank page.
 * - [ ] Edit a record and re-export: the new PDF reflects the changed values,
 *   and two different records produce two visibly different PDFs (not the same
 *   cached bytes for every id).
 * - [ ] If the app shows page previews or reads document info, it feature-detects
 *   (`getProvider().toImages` / `.getMetadata`) or bonds a provider that supports
 *   them — both are OPTIONAL and THROW on bonds that lack them (e.g. PDFKit), so a
 *   preview built on an unsupporting bond errors at runtime, not compile time.
 * - [ ] Styled output (CSS layout, backgrounds, web fonts) actually renders —
 *   which requires a browser-engine bond (Puppeteer). On PDFKit the same HTML
 *   collapses to a plain-text approximation; if the design matters, that's the wrong bond.
 * - [ ] Export is authorized: a signed-in user cannot fetch another user's
 *   document by guessing or incrementing an id — the endpoint scopes every PDF to
 *   its owner (a guessed id returns 403/404, never someone else's invoice).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
