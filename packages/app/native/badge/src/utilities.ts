/**
 * `@molecule/app-badge`
 * Utility functions for badge module.
 */

import { getPermissionStatus, requestPermission, set } from './provider.js'

/**
 * Ensure badge permission and set count
 * @param count - Badge count to set
 * @returns Whether the badge was set successfully
 */
export async function setWithPermission(count: number): Promise<boolean> {
  try {
    const status = await getPermissionStatus()

    if (status === 'unsupported') {
      return false
    }

    if (status === 'denied') {
      return false
    }

    if (status === 'prompt') {
      const newStatus = await requestPermission()
      if (newStatus !== 'granted') {
        return false
      }
    }

    await set(count)
    return true
  } catch {
    return false
  }
}

/**
 * Sync badge with a value (useful for reactive state)
 * @param getValue - Function to get current count
 * @param interval - Sync interval in milliseconds (default: 5000).
 * @returns A cleanup function that stops the sync loop.
 */
export function syncBadge(getValue: () => number | Promise<number>, interval = 5000): () => void {
  let running = true

  const sync = async (): Promise<void> => {
    if (!running) return

    try {
      const count = await getValue()
      await set(count)
    } catch {
      // Ignore errors during sync
    }

    if (running) {
      setTimeout(sync, interval)
    }
  }

  sync()

  return () => {
    running = false
  }
}
