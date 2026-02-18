/**
 * Test helper type definitions.
 *
 * @module
 */

/**
 * Options for waitFor utility.
 */
export interface WaitForOptions {
  timeout?: number
  interval?: number
}

/**
 * Deferred promise structure.
 */
export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * Spy call record.
 */
export interface SpyCall<TArgs extends unknown[], TResult> {
  args: TArgs
  result: TResult
}

/** Spy function with call tracking, count, and reset capabilities. */
export interface Spy<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>
  calls: Array<SpyCall<Parameters<T>, ReturnType<T>>>
  callCount: number
  reset: () => void
}
