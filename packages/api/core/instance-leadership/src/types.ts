/**
 * Type definitions for the instance-leadership core interface.
 *
 * Several subsystems of a multi-instance API assume exactly ONE runner across
 * the whole platform rather than one per instance: pre-warm pool managers,
 * hibernation and archive sweeps, status recorders, periodic billing jobs.
 * Running them twice ranges from wasteful to corrupting. Instance leadership
 * elects one instance — "the leader" — and runs those subsystems only there.
 *
 * The contract is deliberately small: the core names what leadership IS (a lock
 * every instance contends for, held by one, lost when its connection dies) and
 * a provider bond implements it against a shared store (e.g. a PostgreSQL
 * session advisory lock in `@molecule/api-instance-leadership-postgresql`).
 *
 * @module
 */

/**
 * The leadership phase of one instance.
 *
 * - `follower` — the instance is contending for the lock but does not hold it.
 * - `leader` — the instance holds the lock and runs the singleton work.
 * - `stopped` — `release()` was called; the instance no longer contends.
 */
export type LeadershipState = 'follower' | 'leader' | 'stopped'

/**
 * One dedicated lock session, as a provider bond sees it.
 *
 * A session must be backed by a connection the provider owns exclusively: the
 * lock lives and dies with that connection, so an operator never has to tune a
 * TTL and a crashed instance never leaves a stale lock row behind.
 */
export interface LeaderLockSession {
  /**
   * Ask the shared store for the lock WITHOUT blocking.
   *
   * @returns `true` when this session now holds it.
   */
  tryLock(): Promise<boolean>

  /**
   * Release the lock (a no-op when this session does not hold it) and close
   * the connection.
   */
  release(): Promise<void>

  /**
   * Register the "this connection is gone" handler. Called at most once, when
   * the connection errors or the store ends the session.
   *
   * @param handler - Invoked on connection loss.
   */
  onLost(handler: () => void): void
}

/**
 * Creates a fresh lock session.
 *
 * Injected rather than imported so a host application can reuse its own
 * database connection settings, and so tests can drive several simulated
 * instances through one fake store.
 */
export type LeaderLockFactory = () => Promise<LeaderLockSession>

/**
 * What {@link InstanceLeadershipProvider.acquire} needs from the application.
 */
export interface AcquireLeadershipOptions {
  /**
   * Start the singleton subsystems. Invoked once per acquisition — including a
   * RE-acquisition after a connection loss, so it must be safe to call again
   * after {@link AcquireLeadershipOptions.onLost} stopped everything.
   */
  onAcquired: () => void | Promise<void>

  /**
   * Stop the singleton subsystems. Invoked when a leader loses its lock
   * connection, BEFORE the provider tries to re-acquire: the store has (or is
   * about to) release the lock, another instance may already be taking over,
   * and two live leaders is exactly what leadership exists to prevent.
   */
  onLost?: () => void | Promise<void>
}

/**
 * The contract every instance-leadership provider implements.
 *
 * Application code reaches the bonded provider through the accessors in
 * `@molecule/api-instance-leadership` (`setProvider`, `getProvider`,
 * `isLeader`, `acquireLeadership`, `releaseLeadership`) rather than importing
 * a bond.
 *
 * @example
 * ```typescript
 * import { acquireLeadership, isLeader } from '@molecule/api-instance-leadership'
 *
 * acquireLeadership({
 *   onAcquired: () => startPeriodicSweeps(),
 *   onLost: () => stopPeriodicSweeps(),
 * })
 * ```
 */
export interface InstanceLeadershipProvider {
  /**
   * Whether THIS instance currently holds the leadership lock.
   *
   * @returns `true` from the moment the lock is acquired until it is lost or
   * released.
   */
  isLeader(): boolean

  /**
   * The current leadership phase.
   *
   * @returns The {@link LeadershipState}.
   */
  state(): LeadershipState

  /**
   * Start contending for the lock, retrying forever in the background. Never
   * rejects and never blocks — the caller starts its singleton subsystems from
   * {@link AcquireLeadershipOptions.onAcquired}.
   *
   * Calling `acquire()` again while already contending or leading is a no-op.
   *
   * @param options - What to start on acquisition and stop on loss.
   */
  acquire(options: AcquireLeadershipOptions): void

  /**
   * Stop contending and release the lock, so another instance can take over
   * immediately instead of waiting for this process to exit.
   *
   * @returns Resolves once the lock release and the connection close settle.
   */
  release(): Promise<void>
}
