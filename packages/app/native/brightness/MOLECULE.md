# @molecule/app-brightness

Screen brightness control interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-brightness
```

## API

### Interfaces

#### `BrightnessCapabilities`

Brightness capabilities

```typescript
interface BrightnessCapabilities {
  /** Whether brightness control is supported */
  supported: boolean
  /** Whether auto-brightness control is supported */
  canControlAuto: boolean
  /** Whether keep-screen-on is supported */
  canKeepScreenOn: boolean
  /** Whether system brightness can be read */
  canReadSystemBrightness: boolean
  /** Minimum brightness value */
  minBrightness: number
  /** Maximum brightness value */
  maxBrightness: number
}
```

#### `BrightnessOptions`

Brightness options

```typescript
interface BrightnessOptions {
  /** Whether to persist the brightness setting */
  persist?: boolean
  /** Whether to animate the change */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
}
```

#### `BrightnessProvider`

Brightness provider interface

```typescript
interface BrightnessProvider {
  /**
   * Get current brightness
   */
  getBrightness(): Promise<number>

  /**
   * Set screen brightness
   * @param brightness - Brightness value (0-1)
   * @param options - Options
   */
  setBrightness(brightness: number, options?: BrightnessOptions): Promise<void>

  /**
   * Get full brightness state
   */
  getState(): Promise<BrightnessState>

  /**
   * Check if auto-brightness is enabled
   */
  isAutoBrightness(): Promise<boolean>

  /**
   * Enable/disable auto-brightness
   * @param enabled - Whether to enable auto-brightness
   */
  setAutoBrightness(enabled: boolean): Promise<void>

  /**
   * Keep screen on (prevent dimming/sleep)
   * @param keepOn - Whether to keep screen on
   */
  setKeepScreenOn(keepOn: boolean): Promise<void>

  /**
   * Check if keep-screen-on is enabled
   */
  isKeepScreenOn(): Promise<boolean>

  /**
   * Reset brightness to system default
   */
  reset(): Promise<void>

  /**
   * Get the platform's brightness control capabilities.
   * @returns The capabilities indicating which brightness features are supported.
   */
  getCapabilities(): Promise<BrightnessCapabilities>
}
```

#### `BrightnessState`

Brightness state

```typescript
interface BrightnessState {
  /** Current brightness (0-1) */
  brightness: number
  /** Whether auto-brightness is enabled */
  isAuto: boolean
  /** System brightness (0-1) */
  systemBrightness?: number
  /** Whether keep-screen-on is enabled */
  keepScreenOn: boolean
}
```

### Functions

#### `clamp(brightness)`

Clamp a brightness value to the valid range (0-1).

```typescript
function clamp(brightness: number): number
```

- `brightness` — The brightness value to clamp.

**Returns:** The clamped brightness value between 0 and 1.

#### `createBrightnessController()`

Create a brightness controller for smooth brightness animations using ease-out cubic easing.

```typescript
function createBrightnessController(): { animateTo(target: number, duration?: number): Promise<void>; stop(): void; isAnimating(): boolean; }
```

**Returns:** A controller with `animateTo`, `stop`, and `isAnimating` methods.

#### `decrease(amount)`

Decrease brightness by a given amount.

```typescript
function decrease(amount?: number): Promise<void>
```

- `amount` — Amount to decrease (0-1, default: 0.1). Clamped to minimum 0.0.

**Returns:** A promise that resolves when the brightness is adjusted.

#### `fromPercentage(percentage)`

Convert a percentage (0-100) to a brightness value (0-1).

```typescript
function fromPercentage(percentage: number): number
```

- `percentage` — Percentage value between 0 and 100.

**Returns:** The brightness as a decimal between 0 and 1.

#### `getBrightness()`

Get the current screen brightness level.

```typescript
function getBrightness(): Promise<number>
```

**Returns:** The brightness level as a decimal between 0 and 1.

#### `getCapabilities()`

Get the platform's brightness control capabilities.

```typescript
function getCapabilities(): Promise<BrightnessCapabilities>
```

**Returns:** The capabilities indicating which brightness features are supported.

#### `getProvider()`

Get the current brightness provider.

```typescript
function getProvider(): BrightnessProvider
```

**Returns:** The active BrightnessProvider instance.

#### `getState()`

Get the full brightness state including auto-brightness and keep-screen-on status.

```typescript
function getState(): Promise<BrightnessState>
```

**Returns:** The current brightness state.

#### `hasProvider()`

Check if a brightness provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a BrightnessProvider has been set via setProvider.

#### `increase(amount)`

Increase brightness by a given amount.

```typescript
function increase(amount?: number): Promise<void>
```

- `amount` — Amount to increase (0-1, default: 0.1). Clamped to maximum 1.0.

**Returns:** A promise that resolves when the brightness is adjusted.

#### `isAutoBrightness()`

Check if auto-brightness is enabled.

```typescript
function isAutoBrightness(): Promise<boolean>
```

**Returns:** Whether the system auto-brightness feature is active.

#### `isKeepScreenOn()`

Check if keep-screen-on is enabled.

```typescript
function isKeepScreenOn(): Promise<boolean>
```

**Returns:** Whether the screen is being kept on.

#### `reset()`

Reset brightness to the system default setting.

```typescript
function reset(): Promise<void>
```

**Returns:** A promise that resolves when the brightness is reset.

#### `setAutoBrightness(enabled)`

Enable or disable auto-brightness.

```typescript
function setAutoBrightness(enabled: boolean): Promise<void>
```

- `enabled` — Whether to enable auto-brightness.

**Returns:** A promise that resolves when the setting is applied.

#### `setBrightness(brightness, options)`

Set the screen brightness level.

```typescript
function setBrightness(brightness: number, options?: BrightnessOptions): Promise<void>
```

- `brightness` — Brightness value between 0 (darkest) and 1 (brightest).
- `options` — Options for persistence and animation.

**Returns:** A promise that resolves when the brightness is set.

#### `setHalf()`

Set brightness to 50% (0.5).

```typescript
function setHalf(): Promise<void>
```

**Returns:** A promise that resolves when the brightness is set.

#### `setKeepScreenOn(keepOn)`

Enable or disable keep-screen-on to prevent dimming and sleep.

```typescript
function setKeepScreenOn(keepOn: boolean): Promise<void>
```

- `keepOn` — Whether to keep the screen on.

**Returns:** A promise that resolves when the setting is applied.

#### `setMax()`

Set brightness to maximum (1.0).

```typescript
function setMax(): Promise<void>
```

**Returns:** A promise that resolves when the brightness is set.

#### `setMin()`

Set brightness to minimum (0.0).

```typescript
function setMin(): Promise<void>
```

**Returns:** A promise that resolves when the brightness is set.

#### `setProvider(provider)`

Set the brightness provider.

```typescript
function setProvider(provider: BrightnessProvider): void
```

- `provider` — BrightnessProvider implementation to register.

#### `toPercentage(brightness)`

Convert a brightness value (0-1) to a percentage (0-100).

```typescript
function toPercentage(brightness: number): number
```

- `brightness` — Brightness value between 0 and 1.

**Returns:** The brightness as a rounded integer percentage.

#### `withBrightness(brightness, callback)`

Execute a callback with a temporary brightness level, then restore the previous brightness.

```typescript
function withBrightness(brightness: number, callback: () => T | Promise<T>): Promise<T>
```

- `brightness` — The temporary brightness value (0-1) to set during the callback.
- `callback` — The function to execute while the temporary brightness is active.

**Returns:** The return value of the callback.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-brightness`.
