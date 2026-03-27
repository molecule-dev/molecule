/**
 * Gdpr implementation of ComplianceProvider.
 *
 * @module
 */

import type { GdprConfig } from './types.js'

/**
 *
 */
export class GdprComplianceProvider {
  readonly name = 'gdpr'

  constructor(private config: GdprConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: GdprConfig): GdprComplianceProvider {
  return new GdprComplianceProvider(config)
}
