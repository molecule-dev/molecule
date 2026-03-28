/**
 * Provider-agnostic PDF generation and manipulation interface for molecule.dev.
 *
 * Defines the `PDFProvider` interface for generating PDFs from HTML or templates,
 * merging documents, adding watermarks, counting pages, and rendering pages as images.
 * Bond packages (Puppeteer, PDFKit, etc.) implement this interface. Application code
 * uses the convenience functions (`fromHTML`, `fromTemplate`, `merge`, `addWatermark`,
 * `getPageCount`, `getMetadata`, `toImages`) which delegate to the bonded provider.
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
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
