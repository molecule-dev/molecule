/**
 * Small decisions every bond and every app makes the same way: whether the
 * connection can afford speculative loads, and when the browser is idle.
 *
 * @module
 */

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

/**
 * Whether it is reasonable to load something the person has not asked for
 * yet: `false` under the browser's data-saver setting or on a 2G-class
 * connection, `true` otherwise (including where the browser reports nothing).
 *
 * @returns Whether to prefetch.
 */
export function shouldPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection
  if (!connection) return true
  if (connection.saveData) return false
  return !/(^|-)2g$/.test(connection.effectiveType ?? '')
}

interface IdleWindow {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Runs `fn` when the browser is idle, or after `timeout` milliseconds at the
 * latest; where idle callbacks do not exist, after a short delay.
 *
 * @param fn - What to run.
 * @param timeout - The longest wait, in milliseconds. Defaults to 2000.
 * @returns Cancels the run if it has not happened yet.
 */
export function whenIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {}
  const w = window as unknown as IdleWindow
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout })
    return () => w.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(fn, 300)
  return () => window.clearTimeout(id)
}
