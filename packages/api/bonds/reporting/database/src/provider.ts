/**
 * Database implementation of ReportingProvider.
 *
 * @module
 */

import type { DatabaseConfig } from './types.js'

/**
 *
 */
export class DatabaseReportingProvider {
  readonly name = 'database'

  constructor(private config: DatabaseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DatabaseConfig): DatabaseReportingProvider {
  return new DatabaseReportingProvider(config)
}
