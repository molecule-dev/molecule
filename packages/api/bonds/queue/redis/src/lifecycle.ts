/**
 * Process-lifecycle integration for the Redis queue bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether Redis answers a BullMQ command (NON-critical: queued work
 * waits, but the API still serves) and the ordered shutdown closes the worker
 * connections.
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
 * Register the queue readiness check and shutdown hook with the bonded
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
        name: 'queue',
        critical: false,
        timeoutMs: 1_000,
        description: 'Redis answers a queue command',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'queue',
        // First: stop consuming and flush what the workers hold before the
        // cache and the database go away.
        order: 10,
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
