/**
 * Process-lifecycle integration for the PostgreSQL bond.
 *
 * Registering is OPTIONAL and dynamic: a project that does not install
 * `@molecule/api-process-lifecycle` (or its provider) keeps working with no
 * import error, and simply has no readiness probe.
 *
 * When the package IS present, `/health/ready` reports whether PostgreSQL
 * answers `SELECT 1` (a CRITICAL check — without the database the app cannot
 * serve), and the ordered shutdown releases the pool.
 *
 * The check latches no failure state: it opens the lazy pool on first probe if
 * the app has not queried yet, so a database that goes away after boot is
 * reported instead of assumed healthy.
 *
 * @module
 */

import type * as Lifecycle from '@molecule/api-process-lifecycle'

/** Runtime import specifier kept in a variable so the package stays optional. */
const PROCESS_LIFECYCLE = '@molecule/api-process-lifecycle'

/**
 * Register the database readiness check and shutdown hook with the bonded
 * process-lifecycle provider.
 *
 * Idempotent at the bond level (the core keys checks by name), and a no-op when
 * `@molecule/api-process-lifecycle` is not installed.
 *
 * @param resources - The ping and close functions this bond owns.
 */
export function registerLifecycleIntegration(resources: {
  ping: () => Promise<void>
  close: () => Promise<void>
  created: () => boolean
}): void {
  void import(PROCESS_LIFECYCLE)
    .then((lifecycle: typeof Lifecycle) => {
      lifecycle.registerReadinessCheck({
        name: 'database',
        critical: true,
        timeoutMs: 2_000,
        description: 'PostgreSQL accepts a query',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'database-pool',
        // Last: every other hook may still need the database while it closes.
        order: 40,
        timeoutMs: 10_000,
        run: async () => {
          // Never open a pool just to close it.
          if (resources.created()) await resources.close()
        },
      })
    })
    .catch((_error) => {
      // @molecule/api-process-lifecycle is not installed in this project —
      // there is no readiness surface to wire, and no hard dependency.
    })
}
