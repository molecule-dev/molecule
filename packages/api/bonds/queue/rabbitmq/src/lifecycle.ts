/**
 * Process-lifecycle integration for the RabbitMQ queue bond.
 *
 * Optional and dynamic — a project without `@molecule/api-process-lifecycle`
 * imports this bond unchanged. With the package present, `/health/ready`
 * reports whether the broker answers an AMQP round trip (NON-critical) and the
 * ordered shutdown closes the channel and connection.
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
        description: 'RabbitMQ answers an AMQP round trip',
        check: resources.ping,
      })
      lifecycle.registerShutdownHook({
        name: 'queue',
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
