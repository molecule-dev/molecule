/**
 * `@molecule/api-server-default-express` — drop-in Express server
 * factory used by the molecule fleet's `api/src/server.ts`.
 *
 * `createServerFactory({ setupBonds, runMigrations, getRouter })`
 * returns a `(port?) => Promise<server>` function that runs
 * migrations, wires bonds, mounts router + middleware, and starts
 * an HTTP (or self-signed HTTPS for local dev) listener.
 *
 * @example
 * ```ts
 * import { fileURLToPath } from 'node:url'
 * import { createServerFactory } from '@molecule/api-server-default-express'
 *
 * import { setupBonds } from './bonds/index.js'
 * import { runMigrations } from './scripts/migrate.js'
 *
 * export const create = createServerFactory({
 *   setupBonds,
 *   runMigrations,
 *   getRouter: () => import('./App/router.js'),
 * })
 *
 * if (process.argv[1] === fileURLToPath(import.meta.url)) {
 *   create()
 * }
 * ```
 *
 * @module
 */

export * from './server.js'
