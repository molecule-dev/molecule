/**
 * Resource-template resource for molecule.dev.
 *
 * Generic template registry: store reusable, versioned snapshots keyed by
 * (`resourceType`, `slug`) plus a pure-data `instantiate` helper that
 * resolves `{{variable}}` placeholders inside the snapshot to materialise
 * a concrete payload. Handler errors flow through `t()` with English
 * defaults — no companion locale bond is shipped (no user-visible UI text
 * lives in this package).
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-template'
 *
 * // Wire routes into your Express app via `mlcl inject`:
 * // POST   /resource-templates
 * // GET    /resource-templates
 * // GET    /resource-templates/:id
 * // PATCH  /resource-templates/:id
 * // DELETE /resource-templates/:id
 * // POST   /resource-templates/:id/instantiate
 * ```
 *
 * @example
 * ```typescript
 * import { instantiateTemplate } from '@molecule/api-resource-template'
 *
 * const result = instantiateTemplate(
 *   {
 *     snapshot: { title: 'Hello {{name}}', body: '{{greeting}}!' },
 *     variables: [{ name: 'greeting', defaultValue: 'Welcome' }],
 *   },
 *   { name: 'Ada' },
 * )
 * // result.payload === { title: 'Hello Ada', body: 'Welcome!' }
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
