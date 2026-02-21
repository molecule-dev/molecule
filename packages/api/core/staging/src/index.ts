/**
 * Staging environment management core interface for molecule.dev.
 *
 * Defines the abstract `StagingDriver` interface for ephemeral branch-per-feature
 * environments. Driver packages (e.g. `@molecule/api-staging-docker-compose`)
 * implement this interface. The CLI orchestrates lifecycle operations.
 *
 * @example
 * ```typescript
 * import { setProvider, getProvider } from '@molecule/api-staging'
 * import { provider } from '@molecule/api-staging-docker-compose'
 *
 * setProvider(provider)
 *
 * const driver = getProvider()
 * if (driver) {
 *   const urls = await driver.up(env, config)
 *   console.log(`API: ${urls.api}, App: ${urls.app}`)
 * }
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Slugify utility
export * from './slugify.js'

// Provider exports
export * from './provider.js'
