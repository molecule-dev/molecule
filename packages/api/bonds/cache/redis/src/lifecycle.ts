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

/** Runtime import specifier kept in a variable so the package stays optional. */
const PROCESS_LIFECYCLE = '@molecule/api-process-lifecycle'

/** The slice of the core package this bond uses. */
interface LifecycleModule {
  registerReadinessCheck(check: {
    name: string
    check: () => Promise<void>
    timeoutMs?: number
    critical?: boolean
    description?: string
  }): () => void
  registerShutdownHook(hook: {
    name: string
    run: () => Promise<void>
    order?: number
    timeoutMs?: number
  }): () => void
}

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
    .then((module) => {
      const lifecycle = module as unknown as LifecycleModule
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
