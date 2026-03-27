/**
 * Database implementation of NotificationProvider.
 *
 * @module
 */

import type { DatabaseConfig } from './types.js'

/**
 *
 */
export class DatabaseNotificationProvider {
  readonly name = 'database'

  constructor(private config: DatabaseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DatabaseConfig): DatabaseNotificationProvider {
  return new DatabaseNotificationProvider(config)
}
