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
 * @module
 */

export * from './provider.js'
export * from './types.js'
