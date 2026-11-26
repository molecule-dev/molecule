/**
 * Process-lifecycle integration for the Redis cache bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether Redis answers a read (NON-critical: a cache outage degrades
 * latency and hit rate but does not stop the app serving) and the ordered
 * shutdown quits the connection.
 *
 * @module
 */

import type * as Lifecycle from '@molecule/api-process-lifecycle'

/** Runtime import specifier kept in a variable so the package stays optional. */
const PROCESS_LIFECYCLE = '@molecule/api-process-lifecycle'

/**
 * Register the cache readiness check and shutdown hook with the bonded
 * process-lifecycle provider.
 *
 * @param resources - The probe and close functions this bond owns.
 */
export function registerLifecycleIntegration(resources: {
  ping: () => Promise<void>
  close: () => Promise<void>
  created: () => boolean
}): void {
  void import(PROCESS_LIFECYCLE)
    .then((lifecycle: typeof Lifecycle) => {
      lifecycle.registerReadinessCheck({
        name: 'cache',
        critical: false,
        timeoutMs: 1_000,
        description: 'Redis answers a cache read',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'cache',
        // Before the database: nothing should be producing cache traffic once
        // the process is draining.
        order: 20,
        timeoutMs: 5_000,
        run: async () => {
          if (resources.created()) await resources.close()
        },
      })
    })
    .catch((_error) => {
      // @molecule/api-process-lifecycle is not installed — nothing to wire.
    })
}
