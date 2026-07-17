# @molecule/app-screen-orientation

Screen orientation interface for molecule.dev.

Framework-agnostic core for reading and locking display orientation
through a swappable `ScreenOrientationProvider`: current state
(`getOrientation`, `getState`, `getDimensions`), locking (`lock`,
`lockPortrait`, `lockLandscape`, `lockCurrent`, `unlock`, `isLocked`),
and change events (`onChange`).

## Quick Start

```typescript
import {
  getCapabilities,
  hasProvider,
  lockLandscape,
  onChange,
  unlock,
} from '@molecule/app-screen-orientation'

async function enterVideoFullscreen(): Promise<() => Promise<void>> {
  if (!hasProvider()) return async () => {}
  const caps = await getCapabilities()
  if (caps.canLock) await lockLandscape()
  return async () => {
    if (caps.canLock) await unlock()
  }
}

function reactToRotation(cb: (o: string) => void): () => void {
  return onChange((event) => cb(event.current))
}
```

## Type
`native`

## Installation
```bash
npm install @molecule/app-screen-orientation @molecule/app-i18n
```

## API

### Interfaces

#### `OrientationCapabilities`

Orientation capabilities

```typescript
interface OrientationCapabilities {
  /** Whether orientation control is supported */
  supported: boolean
  /** Whether orientation locking is supported */
  canLock: boolean
  /** Supported lock types */
  supportedLockTypes: OrientationLock[]
  /** Whether orientation change detection is supported */
  canDetectChanges: boolean
}
```

#### `OrientationChangeEvent`

Orientation change event

```typescript
interface OrientationChangeEvent {
  /** Previous orientation */
  previous: OrientationType
  /** Current orientation */
  current: OrientationType
  /** Previous angle */
  previousAngle: number
  /** Current angle */
  currentAngle: number
}
```

#### `OrientationState`

Orientation state

```typescript
interface OrientationState {
  /** Current orientation type */
  type: OrientationType
  /** Rotation angle (0, 90, 180, 270) */
  angle: number
  /** Whether orientation is locked */
  isLocked: boolean
  /** Current lock type (if locked) */
  lockType?: OrientationLock
}
```

#### `ScreenDimensions`

Screen dimensions

```typescript
interface ScreenDimensions {
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Device pixel ratio */
  pixelRatio: number
  /** Whether in landscape mode */
  isLandscape: boolean
  /** Whether in portrait mode */
  isPortrait: boolean
}
```

#### `ScreenOrientationProvider`

Screen orientation provider interface

```typescript
interface ScreenOrientationProvider {
  /**
   * Get current orientation
   */
  getOrientation(): Promise<OrientationType>

  /**
   * Get current orientation state
   */
  getState(): Promise<OrientationState>

  /**
   * Get screen dimensions
   */
  getDimensions(): Promise<ScreenDimensions>

  /**
   * Lock screen orientation
   * @param orientation - Orientation to lock to
   */
  lock(orientation: OrientationLock): Promise<void>

  /**
   * Unlock screen orientation
   */
  unlock(): Promise<void>

  /**
   * Check if orientation is locked
   * @returns Whether the screen orientation is currently locked.
   */
  isLocked(): Promise<boolean>

  /**
   * Listen for orientation changes
   * @param callback - Called when orientation changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: OrientationChangeEvent) => void): () => void

  /**
   * Get orientation capabilities
   * @returns The supported orientation features for the current platform.
   */
  getCapabilities(): Promise<OrientationCapabilities>
}
```

### Types

#### `OrientationLock`

Orientation lock type

```typescript
type OrientationLock =
  | 'any' // Allow any orientation
  | 'natural' // Device's natural orientation
  | 'portrait' // Portrait only (any)
  | 'portrait-primary' // Portrait upright only
  | 'portrait-secondary' // Portrait upside-down only
  | 'landscape' // Landscape only (any)
  | 'landscape-primary' // Landscape left only
  | 'landscape-secondary'
```

#### `OrientationType`

Screen orientation type

```typescript
type OrientationType =
  | 'portrait' // Portrait (any)
  | 'portrait-primary' // Portrait upright
  | 'portrait-secondary' // Portrait upside-down
  | 'landscape' // Landscape (any)
  | 'landscape-primary' // Landscape left
  | 'landscape-secondary'
```

### Functions

#### `angleFromOrientation(orientation, naturalPortrait)`

Converts an orientation type to a rotation angle.

```typescript
function angleFromOrientation(orientation: OrientationType, naturalPortrait?: boolean): number
```

- `orientation` — The orientation type to convert.
- `naturalPortrait` — Whether the device's natural orientation is portrait (default `true`).

**Returns:** The rotation angle in degrees (0, 90, 180, or 270).

#### `getCapabilities()`

Gets the orientation capabilities of the current platform.

```typescript
function getCapabilities(): Promise<OrientationCapabilities>
```

**Returns:** The supported orientation features and lock types.

#### `getDimensions()`

Gets the current screen dimensions, pixel ratio, and orientation mode.

```typescript
function getDimensions(): Promise<ScreenDimensions>
```

**Returns:** The screen dimensions and orientation flags.

#### `getOrientation()`

Gets the current screen orientation.

```typescript
function getOrientation(): Promise<OrientationType>
```

**Returns:** The current orientation type (e.g. 'portrait-primary', 'landscape-primary').

#### `getProvider()`

Get the current screen orientation provider.

```typescript
function getProvider(): ScreenOrientationProvider
```

**Returns:** The active ScreenOrientationProvider instance.

#### `getState()`

Gets the full orientation state including type, angle, and lock status.

```typescript
function getState(): Promise<OrientationState>
```

**Returns:** The current orientation state.

#### `hasProvider()`

Check if a screen orientation provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a ScreenOrientationProvider has been set.

#### `isLandscape(orientation)`

Checks whether the given orientation is a landscape variant.

```typescript
function isLandscape(orientation: OrientationType): boolean
```

- `orientation` — The orientation type to check.

**Returns:** Whether the orientation is landscape or landscape-primary/secondary.

#### `isLocked()`

Checks whether the screen orientation is currently locked.

```typescript
function isLocked(): Promise<boolean>
```

**Returns:** Whether the orientation is locked.

#### `isPortrait(orientation)`

Checks whether the given orientation is a portrait variant.

```typescript
function isPortrait(orientation: OrientationType): boolean
```

- `orientation` — The orientation type to check.

**Returns:** Whether the orientation is portrait or portrait-primary/secondary.

#### `lock(orientation)`

Locks the screen to the specified orientation.

```typescript
function lock(orientation: OrientationLock): Promise<void>
```

- `orientation` — The orientation constraint to apply (e.g. 'portrait', 'landscape').

**Returns:** A promise that resolves when the orientation lock is applied.

#### `lockCurrent()`

Locks the screen to whichever orientation family (portrait or landscape) is active.

```typescript
function lockCurrent(): Promise<void>
```

**Returns:** A promise that resolves when the current orientation is locked.

#### `lockLandscape()`

Convenience function to lock the screen to landscape orientation.

```typescript
function lockLandscape(): Promise<void>
```

**Returns:** A promise that resolves when the orientation is locked to landscape.

#### `lockPortrait()`

Convenience function to lock the screen to portrait orientation.

```typescript
function lockPortrait(): Promise<void>
```

**Returns:** A promise that resolves when the orientation is locked to portrait.

#### `onChange(callback)`

Subscribes to screen orientation change events.

```typescript
function onChange(callback: (event: OrientationChangeEvent) => void): () => void
```

- `callback` — Invoked with the previous and current orientation on each change.

**Returns:** An unsubscribe function to stop listening.

#### `orientationFromAngle(angle, naturalPortrait)`

Converts a rotation angle to an orientation type.

```typescript
function orientationFromAngle(angle: number, naturalPortrait?: boolean): OrientationType
```

- `angle` — Rotation angle in degrees (0, 90, 180, 270).
- `naturalPortrait` — Whether the device's natural orientation is portrait (default `true`).

**Returns:** The orientation type corresponding to the given angle.

#### `orientationMatchesLock(current, lockType)`

Check if a current orientation satisfies an orientation lock constraint.
For example, 'portrait-primary' matches both 'portrait' and 'portrait-primary' locks.

```typescript
function orientationMatchesLock(current: OrientationType, lockType: OrientationLock): boolean
```

- `current` — The current orientation type.
- `lockType` — The orientation lock to check against.

**Returns:** Whether the current orientation satisfies the lock constraint.

#### `setProvider(provider)`

Set the screen orientation provider.

```typescript
function setProvider(provider: ScreenOrientationProvider): void
```

- `provider` — ScreenOrientationProvider implementation to register.

#### `unlock()`

Unlocks the screen orientation, allowing free rotation.

```typescript
function unlock(): Promise<void>
```

**Returns:** A promise that resolves when the orientation lock is released.

#### `withOrientation(orientation, callback)`

Execute a callback while the screen is temporarily locked to a specific orientation.
Restores the previous lock state (or unlocks) after the callback completes.

```typescript
function withOrientation(orientation: OrientationLock, callback: () => T | Promise<T>): Promise<T>
```

- `orientation` — The orientation to lock to during execution.
- `callback` — The function to execute while orientation is locked. May be sync or async.

**Returns:** The return value of the callback.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`

- **Every accessor THROWS until `setProvider()` is called** — **no
  prebuilt provider package ships with molecule**; supply a
  `ScreenOrientationProvider` from your native runtime (or a web one over
  the Screen Orientation API).
- **Wiring:** this core delegates to the shared `@molecule/app-bond`
  registry, so `setProvider(provider)` and `bond('screen-orientation',
  provider)` write the same slot — use either.
- On web, `screen.orientation.lock()` generally requires FULLSCREEN first
  (and is rejected on most desktops); iOS Safari doesn't support locking
  at all. Treat locking as best-effort: check `getCapabilities().canLock`
  and design layouts that survive rotation anyway.
- Locking is a per-screen concern — always `unlock()` when leaving the
  screen that locked.

## Translations

Translation strings are provided by `@molecule/app-locales-screen-orientation`.
