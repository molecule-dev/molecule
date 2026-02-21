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
 * @module
 */

// Type exports
export * from './types.js'

// State exports
export * from './state.js'
