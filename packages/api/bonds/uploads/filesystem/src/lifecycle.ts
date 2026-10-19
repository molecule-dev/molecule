/**
 * Process-lifecycle integration for the filesystem uploads bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether the upload directory is writable (NON-critical: a read-only
 * disk breaks uploads without stopping the API serving). There is nothing to
 * close, so no shutdown hook is registered.
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
}

/**
 * Register the storage readiness check with the bonded process-lifecycle
 * provider.
 *
 * @param resources - The probe this bond owns.
 */
export function registerLifecycleIntegration(resources: { ping: () => Promise<void> }): void {
  void import(PROCESS_LIFECYCLE)
    .then((module) => {
      const lifecycle = module as unknown as LifecycleModule
      lifecycle.registerReadinessCheck({
        name: 'storage',
        critical: false,
        timeoutMs: 1_000,
        description: 'The upload directory is writable',
        check: resources.ping,
      })
    })
    .catch((_error) => {
      // @molecule/api-process-lifecycle is not installed — nothing to wire.
    })
}
