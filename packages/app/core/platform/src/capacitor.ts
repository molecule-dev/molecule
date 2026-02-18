/**
 * Capacitor app initialization coordinator.
 *
 * Orchestrates native app startup: waits for device ready, initializes
 * push notifications, and signals readiness for rendering.
 *
 * @module
 */

import { warn } from '@molecule/app-logger'

/**
 * Capacitor app configuration options.
 */
export interface CapacitorAppOptions {
  /**
   * Callback invoked when the app is fully initialized and ready to render.
   */
  onReady?: () => void | Promise<void>

  /**
   * Whether to initialize push notifications on startup.
   * @default false
   */
  pushNotifications?: boolean

  /**
   * Whether to handle deep links on startup.
   * @default false
   */
  deepLinks?: boolean

  /**
   * Deep link handler callback.
   */
  onDeepLink?: (url: string) => void
}

/**
 * Capacitor app coordinator state.
 */
export interface CapacitorAppState {
  /**
   * Whether the app is fully initialized.
   */
  ready: boolean

  /**
   * Whether device ready has fired.
   */
  deviceReady: boolean

  /**
   * Whether push notifications are initialized.
   */
  pushReady: boolean

  /**
   * Initialization error, if any.
   */
  error: Error | null
}

/**
 * Capacitor app coordinator return type.
 */
export interface CapacitorApp {
  /**
   * Initialize the app. Call this during startup.
   */
  initialize(): Promise<void>

  /**
   * Whether the app is fully ready.
   */
  isReady(): boolean

  /**
   * Get the current initialization state.
   */
  getState(): CapacitorAppState

  /**
   * Subscribe to state changes.
   */
  subscribe(callback: (state: CapacitorAppState) => void): () => void

  /**
   * Register a callback for when the app becomes ready.
   * If already ready, the callback fires immediately.
   */
  onReady(callback: () => void): () => void

  /**
   * Clean up listeners.
   */
  destroy(): void
}

/**
 * Creates a Capacitor app coordinator.
 *
 * Orchestrates native app initialization in the correct order:
 * 1. Wait for device ready
 * 2. Initialize push notifications (if configured)
 * 3. Handle deep links (if configured)
 * 4. Signal readiness
 *
 * @param options - Configuration options.
 *
 * @example
 * ```typescript
 * import { createCapacitorApp } from '`@molecule/app-platform`'
 *
 * const app = createCapacitorApp({
 *   pushNotifications: true,
 *   deepLinks: true,
 *   onDeepLink: (url) => router.navigate(url),
 *   onReady: () => console.log('App ready!'),
 * })
 *
 * await app.initialize()
 * ```
 * @returns A CapacitorApp instance with lifecycle, push notification, and deep link management.
 */
export function createCapacitorApp(options: CapacitorAppOptions = {}): CapacitorApp {
  const listeners = new Set<(state: CapacitorAppState) => void>()
  const readyCallbacks = new Set<() => void>()
  const cleanupFns: (() => void)[] = []

  let state: CapacitorAppState = {
    ready: false,
    deviceReady: false,
    pushReady: !options.pushNotifications,
    error: null,
  }

  const updateState = (partial: Partial<CapacitorAppState>): void => {
    state = { ...state, ...partial }
    for (const listener of listeners) {
      listener(state)
    }
  }

  const signalReady = async (): Promise<void> => {
    if (state.ready) return

    updateState({ ready: true })

    for (const callback of readyCallbacks) {
      callback()
    }

    if (options.onReady) {
      await options.onReady()
    }
  }

  const checkReady = async (): Promise<void> => {
    if (state.deviceReady && state.pushReady && !state.ready) {
      await signalReady()
    }
  }

  const waitForDeviceReady = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (typeof document === 'undefined') {
        updateState({ deviceReady: true })
        resolve()
        return
      }

      // Check if already ready (Capacitor fires this before we might listen)
      if (
        typeof window !== 'undefined' &&
        (
          window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
        ).Capacitor?.isNativePlatform?.()
      ) {
        // On native, document may already be ready
        if (document.readyState === 'complete') {
          updateState({ deviceReady: true })
          resolve()
          return
        }
      }

      const handler = (): void => {
        document.removeEventListener('deviceready', handler)
        updateState({ deviceReady: true })
        resolve()
      }

      document.addEventListener('deviceready', handler)

      // Fallback: if not native, resolve on DOMContentLoaded / immediately
      if (
        typeof window === 'undefined' ||
        !(window as unknown as { Capacitor?: unknown }).Capacitor
      ) {
        if (document.readyState !== 'loading') {
          document.removeEventListener('deviceready', handler)
          updateState({ deviceReady: true })
          resolve()
        } else {
          const domHandler = (): void => {
            document.removeEventListener('DOMContentLoaded', domHandler)
            document.removeEventListener('deviceready', handler)
            updateState({ deviceReady: true })
            resolve()
          }
          document.addEventListener('DOMContentLoaded', domHandler)
        }
      }
    })
  }

  const initPush = async (): Promise<void> => {
    if (!options.pushNotifications) return

    try {
      // Dynamically import push provider to avoid hard dependency
      const push = await import('@molecule/app-push')
      const provider = push.getProvider()
      await provider.register()
      updateState({ pushReady: true })
    } catch (error) {
      // Push init failure should not block app readiness
      warn('Push notification initialization failed:', error)
      updateState({ pushReady: true })
    }
  }

  const initDeepLinks = async (): Promise<void> => {
    if (!options.deepLinks || !options.onDeepLink) return

    try {
      const lifecycle = await import('@molecule/app-lifecycle')
      const provider = lifecycle.getProvider()

      // Handle deep links
      const unsubscribe = provider.onUrlOpen(options.onDeepLink)
      cleanupFns.push(unsubscribe)

      // Check launch URL
      const launchInfo = await provider.getLaunchInfo()
      if (launchInfo?.url) {
        options.onDeepLink(launchInfo.url)
      }
    } catch (error) {
      warn('Deep link initialization failed:', error)
    }
  }

  return {
    async initialize(): Promise<void> {
      try {
        // Step 1: Wait for device ready
        await waitForDeviceReady()

        // Step 2: Initialize features in parallel
        await Promise.all([initPush(), initDeepLinks()])

        // Step 3: Check if ready
        await checkReady()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        updateState({ error: err })
        throw err
      }
    },

    isReady(): boolean {
      return state.ready
    },

    getState(): CapacitorAppState {
      return state
    },

    subscribe(callback: (state: CapacitorAppState) => void): () => void {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },

    onReady(callback: () => void): () => void {
      if (state.ready) {
        callback()
      }
      readyCallbacks.add(callback)
      return () => readyCallbacks.delete(callback)
    },

    destroy(): void {
      for (const cleanup of cleanupFns) {
        cleanup()
      }
      cleanupFns.length = 0
      listeners.clear()
      readyCallbacks.clear()
    },
  }
}
