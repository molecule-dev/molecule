/**
 * Csv implementation of ImportProvider.
 *
 * @module
 */

import type { CsvConfig } from './types.js'

/**
 *
 */
export class CsvImportProvider {
  readonly name = 'csv'

  constructor(private config: CsvConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CsvConfig): CsvImportProvider {
  return new CsvImportProvider(config)
}
