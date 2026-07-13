/**
 * BullMQ cron provider configuration types.
 *
 * @module
 */

/**
 * Redis connection options for BullMQ.
 */
export interface RedisConnectionOptions {
  /** Redis host. Defaults to `'localhost'`. */
  host?: string

  /** Redis port. Defaults to `6379`. */
  port?: number

  /** Redis password. */
  password?: string

  /** Redis database number. */
  db?: number

  /** TLS configuration. Set to `true` for default TLS or an object for custom options. */
  tls?: boolean | Record<string, unknown>
}

/**
 * Configuration options for the BullMQ cron provider.
 */
export interface BullMQCronConfig {
  /** Redis connection options. */
  connection: RedisConnectionOptions

  /** Queue name prefix. Defaults to `'molecule-cron'`. */
  queueName?: string

  /** Default timezone for all jobs. */
  timezone?: string

  /**
   * Called whenever the underlying BullMQ queue or worker emits a
   * connection-level `'error'` event (e.g. Redis unreachable). These errors
   * are always logged via the bonded logger regardless of this callback —
   * use it for additional handling (alerting, metrics, a fail-fast exit).
   */
  onError?: (error: Error) => void
}
