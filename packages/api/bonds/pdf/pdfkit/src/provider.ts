/**
 * Pdfkit implementation of PdfProvider.
 *
 * @module
 */

import type { PdfkitConfig } from './types.js'

/**
 *
 */
export class PdfkitPdfProvider {
  readonly name = 'pdfkit'

  constructor(private config: PdfkitConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PdfkitConfig): PdfkitPdfProvider {
  return new PdfkitPdfProvider(config)
}
