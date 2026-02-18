/**
 * Static build metadata (version string, build ID, commit hash, branch, timestamp).
 */
export interface VersionInfo {
  /**
   * Build ID (e.g., from CI/CD).
   */
  buildId: string

  /**
   * Semantic version string.
   */
  version: string

  /**
   * Build timestamp.
   */
  buildTime?: string

  /**
   * Git commit hash.
   */
  commitHash?: string

  /**
   * Git branch.
   */
  branch?: string
}

/**
 * Reactive version state including current build info, update availability, and checking status.
 */
export interface VersionState extends VersionInfo {
  /**
   * New build ID if update detected.
   */
  newBuildId?: string

  /**
   * New version if update detected.
   */
  newVersion?: string

  /**
   * Whether a new version is available.
   */
  isUpdateAvailable: boolean

  /**
   * Whether a new service worker is waiting.
   */
  isServiceWorkerWaiting: boolean

  /**
   * Last check timestamp.
   */
  lastChecked?: Date

  /**
   * Whether currently checking for updates.
   */
  isChecking: boolean
}

/**
 * Service worker registration with update capability.
 */
export interface ServiceWorkerController {
  /**
   * Registers the service worker.
   */
  register(scriptUrl?: string): Promise<ServiceWorkerRegistration | null>

  /**
   * Unregisters the service worker.
   */
  unregister(): Promise<boolean>

  /**
   * Checks for service worker updates.
   */
  update(): Promise<void>

  /**
   * Skips waiting and activates new service worker.
   */
  skipWaiting(): void

  /**
   * Gets the current registration.
   */
  getRegistration(): ServiceWorkerRegistration | null

  /**
   * Gets the waiting service worker.
   */
  getWaiting(): ServiceWorker | null

  /**
   * Checks if a service worker is waiting.
   */
  isWaiting(): boolean

  /**
   * Posts a message to the service worker.
   */
  postMessage(message: unknown): void
}

/**
 * Update check options.
 */
export interface UpdateCheckOptions {
  /**
   * URL to check for version info.
   */
  versionUrl?: string

  /**
   * Interval in milliseconds between checks.
   */
  interval?: number

  /**
   * Whether to check immediately on start.
   */
  immediate?: boolean
}

/**
 * Version lifecycle events emitted during update checks and service worker transitions.
 */
export type VersionEvent =
  | 'update-available'
  | 'service-worker-waiting'
  | 'service-worker-activated'
  | 'check-start'
  | 'check-complete'
  | 'check-error'

/**
 * Callback for version events. Receives event-specific data.
 *
 * @param data - Event payload (varies by event type).
 */
export type VersionEventHandler<T = unknown> = (data: T) => void

/**
 * Version provider interface that all version bond packages must implement.
 * Manages version tracking, update detection, and service worker lifecycle.
 */
export interface VersionProvider {
  /**
   * Gets the current version state.
   */
  getState(): VersionState

  /**
   * Sets the current version info.
   */
  setCurrentVersion(info: VersionInfo): void

  /**
   * Checks for updates.
   */
  checkForUpdates(): Promise<boolean>

  /**
   * Starts periodic update checks.
   */
  startPeriodicChecks(options?: UpdateCheckOptions): void

  /**
   * Stops periodic update checks.
   */
  stopPeriodicChecks(): void

  /**
   * Gets the service worker controller.
   */
  getServiceWorker(): ServiceWorkerController

  /**
   * Applies the update (reloads the page).
   */
  applyUpdate(options?: { force?: boolean }): void

  /**
   * Dismisses the update notification.
   */
  dismissUpdate(): void

  /**
   * Subscribes to version events.
   */
  on<T>(event: VersionEvent, handler: VersionEventHandler<T>): () => void

  /**
   * Unsubscribes from events.
   */
  off<T>(event: VersionEvent, handler: VersionEventHandler<T>): void

  /**
   * Destroys the provider.
   */
  destroy(): void
}
