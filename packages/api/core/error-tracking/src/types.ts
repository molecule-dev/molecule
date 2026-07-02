/**
 * Error tracking core types for molecule.dev.
 *
 * Defines the standard, provider-agnostic interfaces for error tracking /
 * crash reporting providers (Sentry, console, etc.). Every field here is
 * normalized — no provider-specific types (e.g. Sentry's) leak into this
 * contract, so swapping the bonded provider never changes consumer code.
 *
 * @module
 */

/**
 * Severity level for a captured message or exception.
 */
export type ErrorTrackingLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/**
 * Normalized description of the user an event occurred for.
 */
export interface ErrorTrackingUser {
  /** Application-level user id. */
  id?: string

  /** The user's email address. */
  email?: string

  /** The user's username / display handle. */
  username?: string

  /** The user's IP address. */
  ipAddress?: string
}

/**
 * Normalized, provider-agnostic description of the HTTP request (or
 * request-like operation) an event occurred in.
 */
export interface ErrorTrackingRequestContext {
  /** HTTP method (e.g. `GET`). */
  method?: string

  /** Request URL or path, including the query string (e.g. `/api/users/123?full=true`). */
  url?: string

  /**
   * Selected request headers. Callers must NOT include credential-bearing
   * headers (`cookie`, `authorization`) — error trackers are third-party
   * sinks and must never receive session material.
   */
  headers?: Record<string, string | string[] | undefined>

  /** Parsed query parameters. */
  query?: Record<string, unknown>
}

/**
 * Normalized context attached to a captured exception or message.
 */
export interface ErrorTrackingContext {
  /** Short, indexable key/value pairs (e.g. `{ source: 'express' }`). */
  tags?: Record<string, string | number | boolean>

  /** The user the event occurred for. */
  user?: ErrorTrackingUser

  /** Arbitrary additional (non-indexed) structured data. */
  extra?: Record<string, unknown>

  /** The request the event occurred in. */
  request?: ErrorTrackingRequestContext
}

/**
 * Error tracking provider interface.
 *
 * All error tracking providers must implement this interface. Providers
 * receive the normalized {@link ErrorTrackingContext} and map it to their
 * own event model (tags/user/extra scopes, etc.).
 */
export interface ErrorTrackingProvider {
  /**
   * Reports an exception (or any thrown value) to the tracking backend.
   *
   * @param error - The thrown value to report.
   * @param context - Optional normalized context (tags/user/extra/request).
   * @returns The backend's event id when available, otherwise `undefined`.
   */
  captureException(error: unknown, context?: ErrorTrackingContext): string | void

  /**
   * Reports a standalone message (no exception object) to the tracking backend.
   *
   * @param message - The message to report.
   * @param level - Severity level (providers default to `'info'` when omitted).
   * @param context - Optional normalized context (tags/user/extra/request).
   * @returns The backend's event id when available, otherwise `undefined`.
   */
  captureMessage(
    message: string,
    level?: ErrorTrackingLevel,
    context?: ErrorTrackingContext,
  ): string | void

  /**
   * Optionally associates subsequent captures with a user (`null` clears it).
   * Providers whose backend has no user scoping may leave this undefined.
   *
   * @param user - The user to associate, or `null` to clear.
   */
  setUser?(user: ErrorTrackingUser | null): void

  /**
   * Optionally flushes buffered events to the backend — call before process
   * exit so queued reports aren't lost. Providers that deliver synchronously
   * may leave this undefined.
   *
   * @param timeoutMs - Maximum time to wait for delivery.
   * @returns `true` when everything flushed within the timeout.
   */
  flush?(timeoutMs?: number): Promise<boolean>
}
