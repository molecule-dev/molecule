/**
 * Async utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Status of an async operation.
 */
export type PromiseStatus = 'idle' | 'pending' | 'resolved' | 'rejected'

/**
 * State of an async operation.
 */
export interface PromiseState<T> {
  /**
   * Current status.
   */
  status: PromiseStatus

  /**
   * Resolved value.
   */
  value: T | null

  /**
   * Rejection error.
   */
  error: Error | null
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 *
 * @param ms - The delay duration in milliseconds.
 * @returns A promise that resolves after the delay.
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps a function so that it is only invoked after it stops being called
 * for the specified delay. Useful for search inputs and resize handlers.
 *
 * @param fn - The function to debounce.
 * @param delay - The quiet period in milliseconds before the function fires.
 * @returns A debounced version of `fn` that resets its timer on each call.
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Wraps a function so that it fires at most once per `limit` milliseconds.
 * Unlike debounce, the first call executes immediately.
 *
 * @param fn - The function to throttle.
 * @param limit - The minimum interval in milliseconds between invocations.
 * @returns A throttled version of `fn` that drops calls within the limit window.
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Retries an async function with exponential backoff. Each failed attempt
 * waits `initialDelay * backoffFactor^(attempt-1)` ms, capped at `maxDelay`.
 *
 * @param fn - The async function to retry.
 * @param options - Retry configuration.
 * @param options.maxAttempts - Maximum number of attempts (default: 3).
 * @param options.initialDelay - Delay in ms before the first retry (default: 1000).
 * @param options.maxDelay - Maximum delay cap in ms (default: 30000).
 * @param options.backoffFactor - Multiplier applied to the delay after each attempt (default: 2).
 * @returns The resolved value from the first successful attempt.
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  },
): Promise<T> => {
  const maxAttempts = options?.maxAttempts ?? 3
  const initialDelay = options?.initialDelay ?? 1000
  const maxDelay = options?.maxDelay ?? 30000
  const backoffFactor = options?.backoffFactor ?? 2

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxAttempts) break

      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
      await sleep(delay)
    }
  }

  throw lastError
}
