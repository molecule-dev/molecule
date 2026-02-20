/**
 * Type definitions for the monitoring core interface.
 * @module
 */

/**
 * Operational status of a single health check.
 * - 'operational' — fully functional
 * - 'degraded' — functioning but below normal (high latency, partial failures)
 * - 'down' — unavailable
 */
export type CheckStatus = 'operational' | 'degraded' | 'down'

/**
 * Result returned by a single health check function.
 */
export interface CheckResult {
  /** Computed status for this check. */
  status: CheckStatus
  /** Round-trip time in milliseconds, if measured. */
  latencyMs?: number
  /** Human-readable detail message (especially on degraded/down). */
  message?: string
}

/**
 * A named, categorised health check.
 *
 * Registered with a MonitoringProvider via `register()`. The check()
 * function is called on each `runAll()` invocation.
 */
export interface HealthCheck {
  /** Unique identifier for this check (e.g. 'database', 'stripe'). */
  name: string
  /**
   * Logical category grouping related checks
   * (e.g. 'infrastructure', 'external', 'custom').
   */
  category: string
  /** Async function that performs the check and returns a CheckResult. */
  check(): Promise<CheckResult>
}

/**
 * A named check result with timing metadata, as stored in SystemHealth.
 */
export interface CheckEntry extends CheckResult {
  /** Check name, matches HealthCheck.name. */
  name: string
  /** Check category, matches HealthCheck.category. */
  category: string
  /** ISO 8601 timestamp when this check was last executed. */
  checkedAt: string
}

/**
 * Aggregated health snapshot for the entire system.
 */
export interface SystemHealth {
  /**
   * Overall status — the worst status across all individual checks.
   * 'operational' only when all checks are 'operational'.
   */
  status: CheckStatus
  /** Individual check results keyed by check name. */
  checks: Record<string, CheckEntry>
  /** ISO 8601 timestamp when runAll() completed. */
  timestamp: string
}

/**
 * Monitoring provider interface. All monitoring providers must implement this.
 */
export interface MonitoringProvider {
  /**
   * Registers a health check. Duplicate names replace the previous entry.
   *
   * @param check - The health check to register.
   */
  register(check: HealthCheck): void

  /**
   * Removes a previously registered check by name.
   *
   * @param name - The check name to deregister.
   * @returns true if found and removed, false otherwise.
   */
  deregister(name: string): boolean

  /**
   * Runs all registered checks in parallel, stores results, and returns
   * the aggregated SystemHealth.
   *
   * @returns Resolved SystemHealth snapshot.
   */
  runAll(): Promise<SystemHealth>

  /**
   * Returns the most recently computed SystemHealth snapshot, or null if
   * runAll() has not yet been called.
   */
  getLatest(): SystemHealth | null

  /**
   * Returns all registered check names.
   */
  getRegisteredChecks(): string[]
}
