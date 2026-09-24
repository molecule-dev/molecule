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
 * import { addWatermark, fromTemplate, getPageCount, setProvider } from '@molecule/api-pdf'
 * import { createProvider } from '@molecule/api-pdf-pdfkit'
 *
 * // Startup: bond once (singleton). Pure JS — no browser, no native deps.
 * setProvider(createProvider({ defaultFont: 'Helvetica', defaultFontSize: 11 }))
 *
 * const invoice = { number: 'INV-1042', customer: { name: 'Ada Lovelace' }, total: '$120.00' }
 * const pdf = await fromTemplate(
 *   '<h1>Invoice {{number}}</h1><p>Billed to <b>{{customer.name}}</b></p><ul><li>Total: {{total}}</li></ul>',
 *   invoice,
 *   { format: 'Letter', margin: { top: '1in', bottom: '1in', left: '0.75in', right: '0.75in' } },
 * )
 * const stamped = await addWatermark(pdf, 'PAID', { fontSize: 72, opacity: 0.2 })
 * const pages = await getPageCount(stamped) // 1
 * // `stamped` is a Buffer: send it with content-type application/pdf or store it.
 * console.log(pages, stamped.length)
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
 * `fromTemplate` interpolation is plain `{{key}}` / `{{a.b}}` substitution — no
 * loops, conditionals, or HTML escaping (missing keys become `''`). Of
 * `PDFOptions` only `format`, `landscape`, `margin` (`pt`/`px`/`mm`/`cm`/`in`
 * strings) and `width`/`height` are honored; `headerTemplate`,
 * `footerTemplate`, `printBackground`, `pageRanges` and `scale` are ignored.
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
