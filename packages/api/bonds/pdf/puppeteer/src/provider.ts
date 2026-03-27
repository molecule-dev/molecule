/**
 * Puppeteer implementation of PdfProvider.
 *
 * @module
 */

import type { PuppeteerConfig } from './types.js'

/**
 *
 */
export class PuppeteerPdfProvider {
  readonly name = 'puppeteer'

  constructor(private config: PuppeteerConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PuppeteerConfig): PuppeteerPdfProvider {
  return new PuppeteerPdfProvider(config)
}
