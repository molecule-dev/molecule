/**
 * PDFKit programmatic PDF generation provider for molecule.dev.
 *
 * Uses PDFKit for creating PDFs from HTML or templates, and pdf-lib for
 * manipulating existing PDFs (merge, watermark, page count, metadata).
 * Best suited for programmatic PDF generation. For high-fidelity HTML-to-PDF
 * rendering, use `@molecule/api-pdf-puppeteer` instead.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-pdf'
 * import { provider } from '@molecule/api-pdf-pdfkit'
 *
 * setProvider(provider)
 *
 * // Or create with custom config:
 * import { createProvider } from '@molecule/api-pdf-pdfkit'
 * const customProvider = createProvider({ defaultFont: 'Helvetica', defaultFontSize: 14 })
 * setProvider(customProvider)
 * ```
 *
 * @remarks
 * `fromHTML` is a rudimentary HTML renderer, not a browser. It understands ONLY
 * `h1`–`h6`, `p`, `br`, `hr`, `b`/`strong`, `i`/`em`, and `ul`/`ol`/`li`; any other
 * tag renders as its plain text content, and CSS, tables, images, links, and
 * attributes are ignored entirely. Feed it simple semantic markup (or use
 * `fromTemplate` with `{{key}}` interpolation); switch to
 * `@molecule/api-pdf-puppeteer` when the PDF must look like the HTML.
 *
 * This bond does NOT implement the core contract's optional `toImages()` —
 * calling it is a runtime "not a function" error. The puppeteer bond implements
 * it; swap bonds if you need page-to-image rendering.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
