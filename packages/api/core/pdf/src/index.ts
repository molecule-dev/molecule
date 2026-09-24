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
 * - HTML from user input is an injection surface. The Puppeteer bond's `fromTemplate`
 *   HTML-escapes interpolated `data` values (like Handlebars `{{ }}`); the PDFKit bond's
 *   does NOT (a value containing tags is parsed as markup), and `fromHTML` never escapes —
 *   escape untrusted values yourself, or a malicious value can forge or restyle document
 *   content.
 * - **A browser-engine bond renders server-side, so resource URLs in the HTML are fetched by
 *   YOUR server (SSRF).** An `<img src>` / CSS `url()` / `<iframe>` pointing at an internal
 *   address (`169.254.169.254`, `10.…`, `localhost`) is requested with your server's network
 *   access — and can pull the response into the PDF. Never build the HTML from an untrusted
 *   URL; if a document must include user-provided images, fetch + validate them through an
 *   SSRF-safe path first and embed as `data:` URIs, rather than letting the renderer load them.
 *
 * @example
 * ```typescript
 * import { addWatermark, fromTemplate, getPageCount, merge, setProvider } from '@molecule/api-pdf'
 * // PDFKit runs in-process (no browser); use `@molecule/api-pdf-puppeteer` for full HTML/CSS.
 * import { createProvider } from '@molecule/api-pdf-pdfkit'
 *
 * // Startup: bond exactly one provider.
 * setProvider(createProvider({ defaultFontSize: 12 }))
 *
 * // {{key}} placeholders are filled from `data` (dot paths allowed); escape untrusted values.
 * const invoice = await fromTemplate(
 *   '<h1>Invoice {{number}}</h1><p>Bill to: {{customer}}</p><p>Total: {{total}}</p>',
 *   { number: 'INV-1001', customer: 'Ada Lovelace', total: '$120.00' },
 *   { format: 'A4', margin: { top: '2cm', bottom: '2cm' } },
 * )
 * const terms = await fromTemplate('<h2>Terms</h2><p>Payable within {{days}} days.</p>', { days: 30 })
 *
 * const draft = await addWatermark(await merge([invoice, terms]), 'DRAFT', { opacity: 0.2 })
 * const pages = await getPageCount(draft) // 2
 * // `draft` is a Buffer — send it with Content-Type: application/pdf, never JSON.stringify it.
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
