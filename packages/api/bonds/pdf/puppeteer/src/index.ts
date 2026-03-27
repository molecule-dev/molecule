/**
 * Puppeteer PDF provider for molecule.dev.
 *
 * High-fidelity HTML-to-PDF rendering powered by headless Chrome via Puppeteer,
 * with PDF manipulation (merge, watermark, metadata) via pdf-lib.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-pdf'
 * import { provider } from '@molecule/api-pdf-puppeteer'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
