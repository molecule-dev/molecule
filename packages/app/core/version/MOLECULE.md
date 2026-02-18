# @molecule/app-version

Version and update management interface for molecule.dev.

Provides functionality for tracking app versions, detecting updates,
and managing service worker updates.

## Type
`core`

## Installation
```bash
npm install @molecule/app-version
```

## API

### Interfaces

#### `ServiceWorkerController`

Service worker registration with update capability.

```typescript
interface ServiceWorkerController {
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
```

#### `ServiceWorkerTemplateOptions`

Options for generating the service worker template.

```typescript
interface ServiceWorkerTemplateOptions {
  /**
   * Whether to include push notification handlers.
   * @default false
   */
  pushNotifications?: boolean

  /**
   * Maximum number of cached images.
   * @default 50
   */
  maxImageCacheEntries?: number

  /**
   * Additional file extensions to cache (besides .png).
   * @default []
   */
  imageCacheExtensions?: string[]
}
```

#### `UpdateCheckOptions`

Update check options.

```typescript
interface UpdateCheckOptions {
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
```

#### `VersionInfo`

Static build metadata (version string, build ID, commit hash, branch, timestamp).

```typescript
interface VersionInfo {
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
```

#### `VersionProvider`

Version provider interface that all version bond packages must implement.
Manages version tracking, update detection, and service worker lifecycle.

```typescript
interface VersionProvider {
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
```

#### `VersionState`

Reactive version state including current build info, update availability, and checking status.

```typescript
interface VersionState extends VersionInfo {
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
```

### Types

#### `VersionEvent`

Version lifecycle events emitted during update checks and service worker transitions.

```typescript
type VersionEvent =
  | 'update-available'
  | 'service-worker-waiting'
  | 'service-worker-activated'
  | 'check-start'
  | 'check-complete'
  | 'check-error'
```

#### `VersionEventHandler`

Callback for version events. Receives event-specific data.

```typescript
type VersionEventHandler<T = unknown> = (data: T) => void
```

### Functions

#### `applyUpdate(options, options)`

Applies a pending update by activating a waiting service worker
(if present) and reloading the page. If no service worker is
waiting, reloads the page when an update is available or `force` is set.

```typescript
function applyUpdate(options?: { force?: boolean; }): void
```

- `options` — Pass `{ force: true }` to reload even without a detected update.
- `options` — .force - Whether to force a reload regardless of update status.

**Returns:** Nothing.

#### `checkForUpdates()`

Checks for application updates by fetching `/version.json` and
comparing the remote build ID against the current one.

```typescript
function checkForUpdates(): Promise<boolean>
```

**Returns:** `true` if an update is available.

#### `createServiceWorkerController(updateState, emit)`

Creates a service worker controller.

```typescript
function createServiceWorkerController(updateState: (partial: Partial<VersionState>) => void, emit: <T>(event: VersionEvent, data: T) => void): { controller: ServiceWorkerController; getRegistration: () => ServiceWorkerRegistration | null; }
```

- `updateState` — Function to update the version state.
- `emit` — Function to emit events.

**Returns:** The service worker controller.

#### `createVersionChecker(getState, updateState, emit)`

Creates a version checker.

```typescript
function createVersionChecker(getState: () => VersionState, updateState: (partial: Partial<VersionState>) => void, emit: <T>(event: VersionEvent, data: T) => void): () => Promise<boolean>
```

- `getState` — Function to get the current version state.
- `updateState` — Function to update the version state.
- `emit` — Function to emit events.

**Returns:** The check for updates function.

#### `createWebVersionProvider()`

Creates a browser-based version provider that checks for updates
by polling a `/version.json` endpoint, manages a service worker
for cache invalidation, and emits events when updates are available.

```typescript
function createWebVersionProvider(): VersionProvider
```

**Returns:** A fully configured `VersionProvider` for browser environments.

#### `dismissUpdate()`

Dismisses the current update notification by clearing the
`isUpdateAvailable` flag in state.

```typescript
function dismissUpdate(): void
```

**Returns:** Nothing.

#### `generateServiceWorkerTemplate(options)`

Generates a service worker TypeScript source file.

```typescript
function generateServiceWorkerTemplate(options?: ServiceWorkerTemplateOptions): string
```

- `options` — Template configuration options.

**Returns:** The service worker source code as a string.

#### `getProvider()`

Retrieves the bonded version provider. If none is bonded,
automatically creates a browser-based version provider.

```typescript
function getProvider(): VersionProvider
```

**Returns:** The active version provider instance.

#### `getServiceWorker()`

Returns the service worker controller for managing cache
invalidation and skip-waiting lifecycle events.

```typescript
function getServiceWorker(): ServiceWorkerController
```

**Returns:** The `ServiceWorkerController` instance.

#### `getState()`

Returns the current version state snapshot (build ID, version string,
update availability, service worker status).

```typescript
function getState(): VersionState
```

**Returns:** A copy of the current `VersionState`.

#### `setCurrentVersion(info)`

Sets the current application version info. Typically called at
startup with build-time values injected by the bundler.

```typescript
function setCurrentVersion(info: VersionInfo): void
```

- `info` — Build metadata including version, buildId, and optional commitHash.

**Returns:** Nothing.

#### `setProvider(provider)`

Registers a version provider as the active singleton.

```typescript
function setProvider(provider: VersionProvider): void
```

- `provider` — The version provider implementation to bond.

#### `startPeriodicChecks(options)`

Starts periodic update checks at the specified interval.

```typescript
function startPeriodicChecks(options?: UpdateCheckOptions): void
```

- `options` — Check interval and whether to run an immediate check on start.

**Returns:** Nothing.

#### `stopPeriodicChecks()`

Stops periodic update checks started by `startPeriodicChecks()`.

```typescript
function stopPeriodicChecks(): void
```

**Returns:** Nothing.

### Constants

#### `DEFAULT_CHECK_INTERVAL`

Default version check interval (5 minutes).

```typescript
const DEFAULT_CHECK_INTERVAL: number
```

#### `DEFAULT_VERSION_URL`

Default version URL.

```typescript
const DEFAULT_VERSION_URL: "/version.json"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-version`.
