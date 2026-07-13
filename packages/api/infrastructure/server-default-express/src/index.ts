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
 * import { createServerFactory } from '@molecule/api-server-default-express'
 *
 * // In your app's api/src/server.ts these come from the scaffolded files:
 * //   import { setupBonds } from './bonds/index.js'
 * //   import { runMigrations } from './scripts/migrate.js'
 * const create = createServerFactory({
 *   setupBonds,
 *   runMigrations,
 *   // Router loads lazily AFTER setupBonds() so bond-conditional route
 *   // maps see fully-registered providers. The module must export
 *   // `router`. In your app: getRouter: () => import('./App/router.js')
 *   getRouter: async () => ({ router }),
 * })
 *
 * // Runs migrations → wires bonds → mounts middleware + router at /api →
 * // listens on PORT (default 4000). The scaffolded server.ts exports
 * // `create` and invokes it when the file is run directly.
 * await create()
 * ```
 *
 * @module
 */

export * from './server.js'
