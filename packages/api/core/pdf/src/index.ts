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
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
