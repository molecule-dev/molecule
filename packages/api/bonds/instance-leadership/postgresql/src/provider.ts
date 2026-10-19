/**
 * The instance-leadership state machine.
 *
 * One leader across every API instance, elected by a shared lock session, with
 * demotion when the holder loses its connection and background re-acquisition
 * (a follower retries every `retryMs`, default 2 s).
 *
 * The state is per-provider, never module-global, so a host process can create
 * several providers (its server test suite boots multiple apps in one process)
 * without them sharing a leader flag.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  AcquireLeadershipOptions,
  InstanceLeadershipProvider,
  LeaderLockFactory,
  LeaderLockSession,
  LeadershipState,
} from '@molecule/api-instance-leadership'

import { createPostgresLockFactory } from './lock.js'

/**
 * How to build a leadership provider.
 */
export interface PostgresLeadershipProviderOptions {
  /**
   * Opens one dedicated lock session per attempt. Use
   * {@link createPostgresLockFactory} for the production PostgreSQL session,
   * or a fake that shares one "held by" flag in tests.
   */
  createSession: LeaderLockFactory

  /**
   * How often a follower retries, in milliseconds. A function keeps the value
   * lazy so a host can read it from configuration after import. Defaults to
   * 2000; values below 50 are clamped so a misconfiguration cannot spin.
   */
  retryMs?: number | (() => number)

  /**
   * The advisory lock id, used only in log lines (the factory owns the actual
   * lock). Defaults to 0 when omitted.
   */
  lockId?: number
}

/** The clamped, lazily-resolved retry interval. */
function resolveRetryMs(retryMs: number | (() => number) | undefined): number {
  const raw = typeof retryMs === 'function' ? retryMs() : (retryMs ?? 2000)
  return Math.max(50, Number.isFinite(raw) ? raw : 2000)
}

/**
 * Creates an instance-leadership provider.
 *
 * @param options - The lock-session factory and retry interval.
 * @returns A provider implementing the core `InstanceLeadershipProvider` contract.
 *
 * @example
 * ```typescript
 * import { createProvider, createPostgresLockFactory } from '@molecule/api-instance-leadership-postgresql'
 * import { setProvider, acquireLeadership } from '@molecule/api-instance-leadership'
 *
 * const leadership = createProvider({
 *   createSession: createPostgresLockFactory({ lockId: 8675310 }),
 * })
 * setProvider(leadership)
 *
 * acquireLeadership({
 *   onAcquired: () => startPeriodicSweeps(),
 *   onLost: () => stopPeriodicSweeps(),
 * })
 * ```
 */
export function createProvider(
  options: PostgresLeadershipProviderOptions,
): InstanceLeadershipProvider {
  const logger = getLogger()
  let leader = false
  let session: LeaderLockSession | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let released = false
  let attemptInFlight = false
  let acquireOptions: AcquireLeadershipOptions | null = null

  /** Schedule the next acquisition attempt, never keeping the process alive for it. */
  const scheduleRetry = (): void => {
    if (released || retryTimer) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      void tryAcquire()
    }, resolveRetryMs(options.retryMs))
    retryTimer.unref?.()
  }

  /**
   * One acquisition attempt: open a session (if needed) and ask for the lock.
   *
   * Serialized by `attemptInFlight` — a retry tick landing while a slow connect
   * is in flight must not open a second connection.
   */
  const tryAcquire = async (): Promise<void> => {
    if (released || leader || attemptInFlight || !acquireOptions) return
    attemptInFlight = true
    try {
      if (!session) {
        session = await options.createSession()
        session.onLost(() => {
          // The connection is gone, so the store has released the lock.
          // Demote FIRST, then let the operator-facing stop run; a new leader
          // may already be starting its own copy of every singleton.
          const wasLeader = leader
          leader = false
          session = null
          if (wasLeader) {
            logger.warn('Lost platform leadership — stopping singleton subsystems', {
              retryMs: resolveRetryMs(options.retryMs),
            })
            Promise.resolve()
              .then(() => acquireOptions?.onLost?.())
              .catch((error) => logger.error('Leader-lost shutdown failed', { error }))
          }
          scheduleRetry()
        })
      }
      const acquired = await session.tryLock()
      if (!acquired) {
        scheduleRetry()
        return
      }
      leader = true
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      logger.info('Acquired platform leadership — starting singleton subsystems', {
        lockId: options.lockId ?? 0,
      })
      Promise.resolve()
        .then(() => acquireOptions?.onAcquired())
        .catch((error) => {
          logger.error('Leader-only startup failed', { error })
        })
    } catch (error) {
      // Store unreachable or the connect timed out. Drop the session (a
      // half-open one would keep retrying against a dead socket) and try again.
      logger.warn('Leadership lock attempt failed (will retry)', {
        error,
        retryMs: resolveRetryMs(options.retryMs),
      })
      const stale = session
      session = null
      void stale?.release().catch(() => undefined)
      scheduleRetry()
    } finally {
      attemptInFlight = false
    }
  }

  return {
    isLeader(): boolean {
      return leader
    },

    state(): LeadershipState {
      if (released) return 'stopped'
      return leader ? 'leader' : 'follower'
    },

    acquire(nextOptions: AcquireLeadershipOptions): void {
      if (leader || session || released) return
      acquireOptions = nextOptions
      void tryAcquire()
    },

    async release(): Promise<void> {
      released = true
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      leader = false
      const current = session
      session = null
      if (current) await current.release()
    },
  }
}

/**
 * A provider that reads its connection settings from `DATABASE_URL`.
 *
 * Its lock session is opened lazily, so importing (and bonding) this provider
 * never connects. The lock id is the same one the API platform API has used
 * for its singleton work; an app that shares a database with another
 * leadership user must pass its OWN `lockId`.
 */
export const provider: InstanceLeadershipProvider = createProvider({
  createSession: createPostgresLockFactory({ lockId: 8675310 }),
  lockId: 8675310,
})
