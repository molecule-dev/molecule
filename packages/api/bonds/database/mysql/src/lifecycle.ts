/**
 * Process-lifecycle integration for the MySQL bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged and simply has no readiness probe. With the
 * package present, `/health/ready` runs a CRITICAL `SELECT 1` and the ordered
 * shutdown closes the pool.
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
        description: 'MySQL accepts a query',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'database-pool',
        // Last: other hooks may still need the database while it closes.
        order: 40,
        timeoutMs: 10_000,
        run: async () => {
          if (resources.created()) await resources.close()
        },
      })
    })
    .catch((_error) => {
      // @molecule/api-process-lifecycle is not installed — nothing to wire.
    })
}
