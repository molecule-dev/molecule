/**
 * Process-lifecycle integration for the SQLite bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready` runs
 * a CRITICAL `SELECT 1` (a SQLite file can be locked or its directory removed
 * after boot) and the ordered shutdown closes the pool.
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
    .then((module) => {
      const lifecycle = module as unknown as LifecycleModule
      lifecycle.registerReadinessCheck({
        name: 'database',
        critical: true,
        timeoutMs: 2_000,
        description: 'SQLite accepts a query',
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
