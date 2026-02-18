/**
 * Version bond accessor and convenience functions.
 *
 * If no custom provider is bonded, a browser-based version provider
 * is auto-created on first access. Tracks the current build version,
 * checks for updates via a `/version.json` endpoint, manages service
 * worker lifecycle, and emits update events.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createVersionChecker } from './checker.js'
import { createServiceWorkerController } from './service-worker.js'
import type {
  ServiceWorkerController,
  UpdateCheckOptions,
  VersionEvent,
  VersionEventHandler,
  VersionInfo,
  VersionProvider,
  VersionState,
} from './types.js'
import { DEFAULT_CHECK_INTERVAL } from './utilities.js'

/**
 * Creates a browser-based version provider that checks for updates
 * by polling a `/version.json` endpoint, manages a service worker
 * for cache invalidation, and emits events when updates are available.
 *
 * @returns A fully configured `VersionProvider` for browser environments.
 */
export const createWebVersionProvider = (): VersionProvider => {
  let state: VersionState = {
    buildId: '',
    version: '',
    isUpdateAvailable: false,
    isServiceWorkerWaiting: false,
    isChecking: false,
  }

  let checkInterval: NodeJS.Timeout | null = null
  const handlers = new Map<string, Set<VersionEventHandler>>()

  const emit = <T>(event: VersionEvent, data: T): void => {
    handlers.get(event)?.forEach((handler) => handler(data))
  }

  const updateState = (partial: Partial<VersionState>): void => {
    state = { ...state, ...partial }
  }

  const { controller: serviceWorkerController } = createServiceWorkerController(updateState, emit)
  const checkForUpdates = createVersionChecker(() => state, updateState, emit)

  return {
    getState: () => ({ ...state }),

    setCurrentVersion(info: VersionInfo) {
      updateState({
        buildId: info.buildId,
        version: info.version,
        buildTime: info.buildTime,
        commitHash: info.commitHash,
        branch: info.branch,
      })
    },

    checkForUpdates,

    startPeriodicChecks(options?: UpdateCheckOptions) {
      const interval = options?.interval || DEFAULT_CHECK_INTERVAL

      if (checkInterval) {
        clearInterval(checkInterval)
      }

      if (options?.immediate) {
        this.checkForUpdates()
      }

      checkInterval = setInterval(() => {
        this.checkForUpdates()
      }, interval)
    },

    stopPeriodicChecks() {
      if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
      }
    },

    getServiceWorker: () => serviceWorkerController,

    applyUpdate(options?: { force?: boolean }) {
      // Try to activate waiting service worker first
      if (state.isServiceWorkerWaiting) {
        serviceWorkerController.skipWaiting()

        // Wait briefly for activation, then reload
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.reload()
        }, 100)
      } else if (options?.force || state.isUpdateAvailable) {
        if (typeof window !== 'undefined') window.location.reload()
      }
    },

    dismissUpdate() {
      updateState({ isUpdateAvailable: false })
    },

    on<T>(event: VersionEvent, handler: VersionEventHandler<T>) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler as VersionEventHandler)
      return () => handlers.get(event)?.delete(handler as VersionEventHandler)
    },

    off<T>(event: VersionEvent, handler: VersionEventHandler<T>) {
      handlers.get(event)?.delete(handler as VersionEventHandler)
    },

    destroy() {
      this.stopPeriodicChecks()
      handlers.clear()
    },
  }
}

const BOND_TYPE = 'version'

/**
 * Registers a version provider as the active singleton.
 *
 * @param provider - The version provider implementation to bond.
 */
export const setProvider = (provider: VersionProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded version provider. If none is bonded,
 * automatically creates a browser-based version provider.
 *
 * @returns The active version provider instance.
 */
export const getProvider = (): VersionProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebVersionProvider())
  }
  return bondGet<VersionProvider>(BOND_TYPE)!
}

/**
 * Returns the current version state snapshot (build ID, version string,
 * update availability, service worker status).
 *
 * @returns A copy of the current `VersionState`.
 */
export const getState = (): VersionState => getProvider().getState()

/**
 * Sets the current application version info. Typically called at
 * startup with build-time values injected by the bundler.
 *
 * @param info - Build metadata including version, buildId, and optional commitHash.
 * @returns Nothing.
 */
export const setCurrentVersion = (info: VersionInfo): void => getProvider().setCurrentVersion(info)

/**
 * Checks for application updates by fetching `/version.json` and
 * comparing the remote build ID against the current one.
 *
 * @returns `true` if an update is available.
 */
export const checkForUpdates = (): Promise<boolean> => getProvider().checkForUpdates()

/**
 * Starts periodic update checks at the specified interval.
 *
 * @param options - Check interval and whether to run an immediate check on start.
 * @returns Nothing.
 */
export const startPeriodicChecks = (options?: UpdateCheckOptions): void =>
  getProvider().startPeriodicChecks(options)

/**
 * Stops periodic update checks started by `startPeriodicChecks()`.
 * @returns Nothing.
 */
export const stopPeriodicChecks = (): void => getProvider().stopPeriodicChecks()

/**
 * Returns the service worker controller for managing cache
 * invalidation and skip-waiting lifecycle events.
 *
 * @returns The `ServiceWorkerController` instance.
 */
export const getServiceWorker = (): ServiceWorkerController => getProvider().getServiceWorker()

/**
 * Applies a pending update by activating a waiting service worker
 * (if present) and reloading the page. If no service worker is
 * waiting, reloads the page when an update is available or `force` is set.
 *
 * @param options - Pass `{ force: true }` to reload even without a detected update.
 * @param options.force - Whether to force a reload regardless of update status.
 * @returns Nothing.
 */
export const applyUpdate = (options?: { force?: boolean }): void =>
  getProvider().applyUpdate(options)

/**
 * Dismisses the current update notification by clearing the
 * `isUpdateAvailable` flag in state.
 * @returns Nothing.
 */
export const dismissUpdate = (): void => getProvider().dismissUpdate()
