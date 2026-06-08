/**
 * `@molecule/api-bonds-default-express` — default API bond wirings for
 * Express-based apps.
 *
 * Centralizes the 10 byte-identical `setup<Name>()` functions that
 * every flagship app shipped as per-app `api/src/bonds/<name>.ts`
 * wiring files. Per-app bond files become 1-line re-exports:
 *
 * ```ts
 * // api/src/bonds/config-env.ts
 * export { setupConfigEnv } from '@molecule/api-bonds-default-express'
 * ```
 *
 * @module
 */

export * from './billing.js'
export * from './handlers.js'
export * from './middleware.js'
export * from './migrate.js'
export * from './resources.js'
export * from './routes.js'
export * from './schemas.js'
export * from './setup.js'
