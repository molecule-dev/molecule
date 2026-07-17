/**
 * BullMQ cron provider configuration types.
 *
 * @module
 */

import type { ConnectionOptions as TLSConnectionOptions } from 'node:tls'

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

  /**
   * Full Redis connection URL. Takes precedence over `host`/`port`/`password`/
   * `db` (ioredis parses the URL first, so those fields only fill gaps the URL
   * leaves). Use the `rediss://` scheme for a TLS endpoint — it enables TLS
   * automatically, same as passing `tls`.
   */
  url?: string

  /**
   * TLS options for the Redis connection, forwarded to the ioredis client
   * BullMQ builds. Pass `true` (shorthand for `{}`, ioredis' "TLS with
   * defaults") to enable TLS, or a `tls.ConnectionOptions` object
   * (`ca`/`cert`/`key`/`rejectUnauthorized`/`servername`/…) for a managed
   * Redis that requires it. Omit (or `false`) for a plaintext connection. A
   * `rediss://` `url` also enables TLS on its own.
   */
  tls?: boolean | TLSConnectionOptions
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
