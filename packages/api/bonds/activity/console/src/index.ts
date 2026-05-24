/**
 * Console activity sink for molecule.dev.
 *
 * Logs captured activity events via `@molecule/api-logger`. The default sink
 * for standalone scaffolded apps.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider } from '@molecule/api-activity-console'
 *
 * setSink(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
