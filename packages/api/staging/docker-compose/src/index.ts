/**
 * Docker Compose staging driver for molecule.dev.
 *
 * Manages ephemeral staging environments using Docker Compose.
 * Each feature branch gets isolated API, App, and database containers
 * with unique port allocations and networking.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-staging'
 * import { provider } from '@molecule/api-staging-docker-compose'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

// Compose generator
export * from './compose-generator.js'

// Provider exports
export * from './provider.js'
