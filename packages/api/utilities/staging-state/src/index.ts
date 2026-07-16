/**
 * State management for active staging environments in molecule.dev.
 *
 * Manages the `.molecule/staging.json` file that tracks ephemeral
 * branch-per-feature staging environments within a project.
 *
 * @example
 * ```typescript
 * import { addEnvironment, listEnvironments, allocatePort } from '@molecule/api-staging-state'
 *
 * const ports = await allocatePort('/path/to/project', { start: 4001, end: 4099 })
 * await addEnvironment('/path/to/project', {
 *   slug: 'feat-login',
 *   branch: 'feature/login',
 *   driver: 'docker-compose',
 *   status: 'running',
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString(),
 *   urls: { api: `http://localhost:${ports.api}` },
 *   ports,
 * })
 * ```
 *
 * @remarks
 * Used by the `mlcl stage` staging drivers; the state file is per-project
 * bookkeeping, not a database. Two sharp edges:
 *
 * - No locking, and mutations are read-modify-overwrite. `loadState()` treats
 *   ANY read failure (missing, unreadable, corrupt JSON) as an empty state, so
 *   a concurrent mutator or a transient read error followed by a save can drop
 *   previously-tracked environments. Serialize access (one driver process at a
 *   time per project).
 * - `allocatePort()` only avoids ports recorded in this state file — it never
 *   probes the OS. A port held by an unrelated process is still handed out;
 *   callers should tolerate bind failures and retry with the next range.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// State exports
export * from './state.js'
