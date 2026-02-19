# @molecule/app-badge

App badge/notification count interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-badge
```

## API

### Interfaces

#### `BadgeCapabilities`

Badge capabilities

```typescript
interface BadgeCapabilities {
  /** Whether badges are supported */
  supported: boolean
  /** Whether permission is required */
  requiresPermission: boolean
  /** Maximum badge count (if limited) */
  maxCount?: number
  /** Whether text badges are supported */
  supportsText: boolean
  /** Whether badges can be cleared */
  canClear: boolean
}
```

#### `BadgeOptions`

Options for setting the app icon badge (numeric count or text overlay).

```typescript
interface BadgeOptions {
  /** Badge count (0 to clear) */
  count: number
  /** Badge text (if supported, overrides count) */
  text?: string
}
```

#### `BadgeProvider`

Badge provider interface

```typescript
interface BadgeProvider {
  /**
   * Set the app badge count
   * @param count - Badge count (0 to clear)
   */
  set(count: number): Promise<void>

  /**
   * Get the current badge count
   */
  get(): Promise<number>

  /**
   * Clear the badge (set to 0)
   */
  clear(): Promise<void>

  /**
   * Increment the badge count
   * @param amount - Amount to increment (default: 1)
   * @returns The new badge count after incrementing.
   */
  increment(amount?: number): Promise<number>

  /**
   * Decrement the badge count
   * @param amount - Amount to decrement (default: 1)
   * @returns The new badge count after decrementing.
   */
  decrement(amount?: number): Promise<number>

  /**
   * Check if badges are supported
   * @returns `true` if the platform supports badges.
   */
  isSupported(): Promise<boolean>

  /**
   * Get badge permission status
   * @returns The current permission status.
   */
  getPermissionStatus(): Promise<BadgePermissionStatus>

  /**
   * Request badge permission
   * @returns The resulting permission status after the request.
   */
  requestPermission(): Promise<BadgePermissionStatus>

  /**
   * Get badge state
   * @returns The current badge state (count, supported, permissionGranted).
   */
  getState(): Promise<BadgeState>

  /**
   * Get badge capabilities
   * @returns The platform's badge capabilities.
   */
  getCapabilities(): Promise<BadgeCapabilities>
}
```

#### `BadgeState`

Current app badge state: count, platform support, and permission status.

```typescript
interface BadgeState {
  /** Current badge count */
  count: number
  /** Whether badge is supported */
  supported: boolean
  /** Whether permission is granted */
  permissionGranted: boolean
}
```

### Types

#### `BadgePermissionStatus`

Badge permission status

```typescript
type BadgePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'
```

### Functions

#### `clear()`

Clear the badge (set to 0).

```typescript
function clear(): Promise<void>
```

**Returns:** A promise that resolves when the badge is cleared.

#### `decrement(amount)`

Decrement the badge count.

```typescript
function decrement(amount?: number): Promise<number>
```

- `amount` — Amount to decrement (default: 1).

**Returns:** The new badge count after decrementing.

#### `get()`

Get the current badge count.

```typescript
function get(): Promise<number>
```

**Returns:** The current count.

#### `getCapabilities()`

Get the platform's badge capabilities.

```typescript
function getCapabilities(): Promise<BadgeCapabilities>
```

**Returns:** The badge capabilities.

#### `getPermissionStatus()`

Get badge permission status.

```typescript
function getPermissionStatus(): Promise<BadgePermissionStatus>
```

**Returns:** The current permission status.

#### `getProvider()`

Get the current badge provider

```typescript
function getProvider(): BadgeProvider
```

**Returns:** The bonded BadgeProvider.

#### `getState()`

Get badge state (count, supported, permissionGranted).

```typescript
function getState(): Promise<BadgeState>
```

**Returns:** The current badge state.

#### `hasProvider()`

Check if a badge provider is bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is available.

#### `increment(amount)`

Increment the badge count.

```typescript
function increment(amount?: number): Promise<number>
```

- `amount` — Amount to increment (default: 1).

**Returns:** The new badge count after incrementing.

#### `isSupported()`

Check if badges are supported on this platform.

```typescript
function isSupported(): Promise<boolean>
```

**Returns:** `true` if badges are supported, `false` if no provider is set or badges are unsupported.

#### `requestPermission()`

Request badge permission.

```typescript
function requestPermission(): Promise<BadgePermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `set(count)`

Set the app badge count.

```typescript
function set(count: number): Promise<void>
```

- `count` — Badge count (0 to clear).

**Returns:** A promise that resolves when the badge count is set.

#### `setProvider(provider)`

Set the badge provider

```typescript
function setProvider(provider: BadgeProvider): void
```

- `provider` — BadgeProvider implementation

#### `setWithPermission(count)`

Ensure badge permission and set count

```typescript
function setWithPermission(count: number): Promise<boolean>
```

- `count` — Badge count to set

**Returns:** Whether the badge was set successfully

#### `syncBadge(getValue, interval)`

Sync badge with a value (useful for reactive state)

```typescript
function syncBadge(getValue: () => number | Promise<number>, interval?: number): () => void
```

- `getValue` — Function to get current count
- `interval` — Sync interval in milliseconds (default: 5000).

**Returns:** A cleanup function that stops the sync loop.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-badge`.
