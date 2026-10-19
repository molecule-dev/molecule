/**
 * Process-lifecycle integration for the S3 uploads bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether the bucket answers a `HEAD` (NON-critical: an upload outage
 * does not stop the API serving) and the ordered shutdown destroys the SDK
 * client.
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
 * Register the storage readiness check and shutdown hook with the bonded
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
        name: 'storage',
        // The HEAD is a billed request: a slow/failed bucket should be visible
        // but must not remove a serving instance from rotation.
        critical: false,
        timeoutMs: 2_000,
        description: 'S3 bucket answers a HEAD request',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'storage',
        order: 30,
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
