/**
 * Type definitions for staging state management.
 *
 * @module
 */

/**
 * Record for a single active staging environment.
 */
export interface StagingEnvironmentRecord {
  /** Unique slug derived from branch name. */
  slug: string

  /** Original git branch name. */
  branch: string

  /** Name of the staging driver managing this environment. */
  driver: string

  /** ISO 8601 creation timestamp. */
  createdAt: string

  /** ISO 8601 last-updated timestamp. */
  updatedAt: string

  /** Deployed URLs. */
  urls: { api?: string; app?: string }

  /** Allocated ports. */
  ports: { api?: number; app?: number; db?: number }

  /** Current environment status. */
  status: 'running' | 'stopped' | 'error' | 'creating' | 'destroying'

  /** Driver-specific metadata. */
  driverMeta?: Record<string, unknown>
}

/**
 * Root state file schema for `.molecule/staging.json`.
 */
export interface StagingState {
  /** Schema version. */
  version: 1

  /** Active environments keyed by slug. */
  environments: Record<string, StagingEnvironmentRecord>
}
