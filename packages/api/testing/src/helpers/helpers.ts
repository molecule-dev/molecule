/**
 * Test helper utilities for molecule.dev.
 *
 * @module
 */

import type { Deferred, Spy, WaitForOptions } from './types.js'

/**
 * Waits for a specified number of milliseconds.
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after the delay.
 */
export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls a condition function until it returns true, or throws after the timeout.
 * @param condition - A function that returns `true` (or a Promise resolving to `true`) when the condition is met.
 * @param options - Timeout and polling interval configuration.
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options?: WaitForOptions,
): Promise<void> => {
  const timeout = options?.timeout ?? 5000
  const interval = options?.interval ?? 100
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await condition()) return
    await wait(interval)
  }

  throw new Error(`waitFor timed out after ${timeout}ms`)
}

/**
 * Creates a deferred promise that can be resolved or rejected externally.
 * @returns An object with `promise`, `resolve`, and `reject` properties.
 */
export const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

/**
 * Runs a function and asserts it throws. Optionally checks the error type.
 * @param fn - The function expected to throw (sync or async).
 * @param errorType - Optional error constructor to assert against.
 * @returns The caught error instance.
 */
export const expectThrows = async <T extends Error = Error>(
  fn: () => Promise<unknown> | unknown,
  errorType?: new (...args: unknown[]) => T,
): Promise<T> => {
  try {
    await fn()
    throw new Error('Expected function to throw')
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected function to throw') {
      throw error
    }
    if (errorType && !(error instanceof errorType)) {
      throw new Error(
        `Expected error of type ${errorType.name}, got ${(error as Error).constructor.name}`,
        { cause: error },
      )
    }
    return error as T
  }
}

/**
 * Creates a spy function that records all calls with arguments and return values.
 * @param implementation - Optional real implementation to delegate to.
 * @returns A spy function with `calls`, `callCount`, and `reset()` properties.
 */
export const createSpy = <T extends (...args: unknown[]) => unknown>(
  implementation?: T,
): Spy<T> => {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = []

  const spy = ((...args: Parameters<T>): ReturnType<T> => {
    const result = implementation?.(...args) as ReturnType<T>
    calls.push({ args, result })
    return result
  }) as Spy<T>

  Object.defineProperty(spy, 'calls', { get: () => calls })
  Object.defineProperty(spy, 'callCount', { get: () => calls.length })
  spy.reset = () => {
    calls.length = 0
  }

  return spy
}

/**
 * Generates a random alphanumeric string.
 * @param length - Character count (default 10).
 * @returns A random string of the specified length.
 */
export const randomString = (length: number = 10): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Generates a random email address at `test.molecule.dev`.
 * @returns A random email string.
 */
export const randomEmail = (): string => `${randomString(8)}@test.molecule.dev`

/**
 * Generates a random UUID v4 via `crypto.randomUUID()`.
 * @returns A random UUID string.
 */
export const randomUUID = (): string => crypto.randomUUID()
