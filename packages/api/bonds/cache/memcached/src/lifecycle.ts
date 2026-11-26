/**
 * Process-lifecycle integration for the Memcached cache bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether Memcached answers a read (NON-critical) and the ordered
 * shutdown closes the client.
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
        description: 'Memcached answers a cache read',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'cache',
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
