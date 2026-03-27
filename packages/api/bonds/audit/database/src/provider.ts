/**
 * Database implementation of AuditProvider.
 *
 * @module
 */

import type { DatabaseConfig } from './types.js'

/**
 *
 */
export class DatabaseAuditProvider {
  readonly name = 'database'

  constructor(private config: DatabaseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DatabaseConfig): DatabaseAuditProvider {
  return new DatabaseAuditProvider(config)
}
