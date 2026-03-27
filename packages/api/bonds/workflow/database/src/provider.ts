/**
 * Database implementation of WorkflowProvider.
 *
 * @module
 */

import type { DatabaseConfig } from './types.js'

/**
 *
 */
export class DatabaseWorkflowProvider {
  readonly name = 'database'

  constructor(private config: DatabaseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DatabaseConfig): DatabaseWorkflowProvider {
  return new DatabaseWorkflowProvider(config)
}
