/**
 * PostgreSQL session-advisory-lock sessions for instance leadership.
 *
 * A session is one dedicated `pg.Client` (never a pool: a session lock is owned
 * by its backend connection, and returning it to a pool would let unrelated
 * queries run inside the lock's session) holding one advisory lock id.
 *
 * @module
 */

import pg from 'pg'

import { getLogger } from '@molecule/api-bond'
import type { LeaderLockFactory, LeaderLockSession } from '@molecule/api-instance-leadership'

/**
 * How to open the dedicated leadership connection.
 */
export interface PostgresLeaderLockOptions {
  /**
   * The lock id to hold. This is an arbitrary 64-bit integer that must be
   * unique across everything sharing the database: leadership must never
   * contend with a migration lock or another feature's advisory lock.
   */
  lockId: number

  /** Connection string. Defaults to `process.env.DATABASE_URL`. */
  connectionString?: string

  /**
   * TLS configuration passed to `pg`. Omit to let the driver decide from the
   * connection string (`sslmode=require` still enables TLS).
   */
  ssl?: pg.ConnectionConfig['ssl']

  /**
   * Open a connected client. Injected by a host that owns its own connection
   * settings (e.g. a platform API with a shared SSL derivation helper); the
   * default creates a `pg.Client` from {@link PostgresLeaderLockOptions.connectionString}.
   *
   * @param connectionString - The resolved connection string.
   * @param ssl - The configured TLS options.
   * @returns A connected `pg.Client`.
   */
  connect?: (connectionString: string, ssl: pg.ConnectionConfig['ssl']) => Promise<pg.Client>
}

/**
 * The production session: one `pg.Client`, one advisory lock.
 *
 * Exported so a host that owns its own connection settings (the platform API's
 * SSL derivation, a Vault-backed URL resolver) can build a session directly and
 * pass it to the provider as its `createSession` factory.
 */
export class PgLeaderLockSession implements LeaderLockSession {
  private lostHandler: (() => void) | null = null
  private lost = false

  /**
   * Track the connection's lifecycle so a lost session demotes the leader.
   *
   * @param client - A connected client owned exclusively by this session.
   * @param lockId - The advisory lock id to hold.
   */
  constructor(
    private readonly client: pg.Client,
    private readonly lockId: number,
  ) {
    const lost = (): void => {
      if (this.lost) return
      this.lost = true
      this.lostHandler?.()
    }
    // `error` covers a socket/network failure; `end` covers the backend ending
    // the session (a server restart, an idle-session kill). Either way the lock
    // is gone.
    this.client.on('error', (error) => {
      getLogger().warn('Leadership lock connection error', { error })
      lost()
    })
    this.client.on('end', lost)
  }

  /** {@inheritDoc LeaderLockSession.tryLock} */
  async tryLock(): Promise<boolean> {
    const { rows } = await this.client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [this.lockId],
    )
    return rows[0]?.locked === true
  }

  /** {@inheritDoc LeaderLockSession.release} */
  async release(): Promise<void> {
    if (!this.lost) {
      try {
        await this.client.query('SELECT pg_advisory_unlock($1)', [this.lockId])
      } catch (error) {
        // The session is ending either way, and a session lock is released by
        // the backend when it ends — an unlock failure changes nothing.
        getLogger().debug('Leadership advisory unlock failed; the session end releases it', {
          error,
        })
      }
    }
    try {
      await this.client.end()
    } catch (_error) {
      // Already ended.
    }
  }

  /** {@inheritDoc LeaderLockSession.onLost} */
  onLost(handler: () => void): void {
    this.lostHandler = handler
  }
}

/**
 * Opens a dedicated PostgreSQL session for leadership.
 *
 * The connect timeout bounds a hung database: without it a boot could sit in
 * `acquire()` forever with no leader and no log line.
 *
 * @param connectionString - The connection string to dial.
 * @param ssl - TLS options for the client.
 * @returns A connected client.
 */
async function defaultConnect(
  connectionString: string,
  ssl: pg.ConnectionConfig['ssl'],
): Promise<pg.Client> {
  const client = new pg.Client({
    connectionString,
    ssl,
    connectionTimeoutMillis: 10_000,
  })
  await client.connect()
  return client
}

/**
 * Builds a {@link LeaderLockFactory} that opens PostgreSQL session locks.
 *
 * Each call to the factory opens a NEW dedicated connection — a follower
 * retries on its own connection, and a leader reconnects on a fresh one after
 * losing the old.
 *
 * @param options - The lock id, connection settings and optional connect hook.
 * @returns A factory the leadership provider calls to open each session.
 * @throws {Error} When no connection string is configured (at factory-call
 * time, so a boot fails with an actionable message rather than hanging).
 *
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-instance-leadership-postgresql'
 *
 * const leadership = createProvider({ createSession: createPostgresLockFactory({ lockId: 8675310 }) })
 * ```
 */
export function createPostgresLockFactory(options: PostgresLeaderLockOptions): LeaderLockFactory {
  const connect = options.connect ?? defaultConnect
  return async (): Promise<LeaderLockSession> => {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'Instance leadership needs DATABASE_URL (or an explicit connectionString): a PostgreSQL ' +
          'session advisory lock is how one API instance is elected leader across every Machine.',
      )
    }
    const client = await connect(connectionString, options.ssl)
    return new PgLeaderLockSession(client, options.lockId)
  }
}
