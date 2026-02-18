# @molecule/app-battery

Battery status interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-battery
```

## API

### Interfaces

#### `BatteryCapabilities`

Battery capabilities

```typescript
interface BatteryCapabilities {
  /** Whether battery monitoring is supported */
  supported: boolean
  /** Whether charging time estimation is available */
  hasChargingTime: boolean
  /** Whether discharging time estimation is available */
  hasDischargingTime: boolean
  /** Whether low power mode detection is available */
  hasLowPowerMode: boolean
  /** Whether charging state detail is available */
  hasChargingState: boolean
}
```

#### `BatteryChangeEvent`

Battery change event

```typescript
interface BatteryChangeEvent {
  /** Previous status */
  previous: BatteryStatus
  /** Current status */
  current: BatteryStatus
  /** Whether level changed */
  levelChanged: boolean
  /** Whether charging state changed */
  chargingChanged: boolean
}
```

#### `BatteryProvider`

Battery provider interface

```typescript
interface BatteryProvider {
  /**
   * Get current battery status
   * @returns The current battery status including level, charging state, and time estimates.
   */
  getStatus(): Promise<BatteryStatus>

  /**
   * Get current battery level
   * @returns Level (0-1)
   */
  getLevel(): Promise<number>

  /**
   * Check if device is charging
   * @returns Whether the device is currently charging.
   */
  isCharging(): Promise<boolean>

  /**
   * Check if low power mode is enabled
   * @returns Whether low power mode is currently active.
   */
  isLowPowerMode(): Promise<boolean>

  /**
   * Listen for battery status changes
   * @param callback - Called when battery status changes
   * @returns Unsubscribe function
   */
  onChange(callback: (event: BatteryChangeEvent) => void): () => void

  /**
   * Listen for charging state changes
   * @param callback - Called when charging state changes
   * @returns Unsubscribe function
   */
  onChargingChange(callback: (isCharging: boolean) => void): () => void

  /**
   * Listen for low battery
   * @param callback - Called when battery goes low
   * @param threshold - Threshold (default: 0.2)
   * @returns Unsubscribe function
   */
  onLow(callback: (level: number) => void, threshold?: number): () => void

  /**
   * Listen for critical battery
   * @param callback - Called when battery goes critical
   * @param threshold - Threshold (default: 0.05)
   * @returns Unsubscribe function
   */
  onCritical(callback: (level: number) => void, threshold?: number): () => void

  /**
   * Get battery capabilities
   * @returns The battery capabilities indicating supported monitoring features.
   */
  getCapabilities(): Promise<BatteryCapabilities>
}
```

#### `BatteryStatus`

Device battery status: level (0–1), charging state, time estimates, and low/critical flags.

```typescript
interface BatteryStatus {
  /** Battery level (0-1) */
  level: number
  /** Whether device is charging */
  isCharging: boolean
  /** Detailed charging state */
  chargingState: ChargingState
  /** Estimated time to full charge (seconds, if charging) */
  chargingTime?: number
  /** Estimated time to discharge (seconds, if discharging) */
  dischargingTime?: number
  /** Whether battery is in low power mode */
  isLowPowerMode?: boolean
  /** Whether battery level is low (< 20%) */
  isLow: boolean
  /** Whether battery level is critical (< 5%) */
  isCritical: boolean
}
```

#### `BatteryThresholds`

Battery level thresholds

```typescript
interface BatteryThresholds {
  /** Low battery threshold (default: 0.2) */
  low: number
  /** Critical battery threshold (default: 0.05) */
  critical: number
}
```

### Types

#### `ChargingState`

Battery charging state

```typescript
type ChargingState =
  | 'charging' // Currently charging
  | 'discharging' // Running on battery
  | 'full' // Fully charged
  | 'not-charging' // Not charging (plugged in but not charging)
  | 'unknown'
```

### Functions

#### `createBatteryAwareExecutor(minimumLevel)`

Create a battery-aware task executor

```typescript
function createBatteryAwareExecutor(minimumLevel?: number): { execute<T>(task: () => T | Promise<T>, fallback?: () => T | Promise<T>): Promise<T | undefined>; canExecute(): Promise<boolean>; }
```

- `minimumLevel` — Minimum battery level to execute (0-1)

**Returns:** An executor object with `execute` and `canExecute` methods gated by battery level.

#### `formatRemainingTime(seconds, t)`

Format remaining time

```typescript
function formatRemainingTime(seconds: number, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `seconds` — Remaining time in seconds
- `t` — Optional translation function for localized formatting

**Returns:** A human-readable time string (e.g., "2h 15m" or "30m"), or "Unknown" if the value is not finite.

#### `getBatteryIcon(status)`

Get battery icon name based on level and charging state

```typescript
function getBatteryIcon(status: BatteryStatus): string
```

- `status` — Battery status

**Returns:** The icon name corresponding to the battery level and charging state.

#### `getCapabilities()`

Get the platform's battery monitoring capabilities.

```typescript
function getCapabilities(): Promise<BatteryCapabilities>
```

**Returns:** The battery capabilities indicating which monitoring features are available.

#### `getChargingStateText(state, t)`

Get charging state description

```typescript
function getChargingStateText(state: ChargingState, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `state` — Charging state
- `t` — Optional translation function for localized descriptions

**Returns:** A human-readable label for the charging state (e.g., "Charging", "On Battery").

#### `getLevel()`

Get current battery level

```typescript
function getLevel(): Promise<number>
```

**Returns:** The battery level as a decimal between 0 and 1.

#### `getLevelText(level)`

Get battery level as text

```typescript
function getLevelText(level: number): string
```

- `level` — Battery level (0-1)

**Returns:** The battery level formatted as a percentage string (e.g., "85%").

#### `getProvider()`

Get the current battery provider

```typescript
function getProvider(): BatteryProvider
```

**Returns:** The active battery provider instance.

#### `getStatus()`

Get current battery status

```typescript
function getStatus(): Promise<BatteryStatus>
```

**Returns:** The current battery status including level, charging state, and time estimates.

#### `hasProvider()`

Check if a battery provider is set

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a battery provider has been registered.

#### `isAboveThreshold(level, threshold)`

Check if battery level is above threshold

```typescript
function isAboveThreshold(level: number, threshold: number): boolean
```

- `level` — Battery level (0-1)
- `threshold` — Threshold (0-1)

**Returns:** Whether the battery level exceeds the given threshold.

#### `isCharging()`

Check if the device is currently charging.

```typescript
function isCharging(): Promise<boolean>
```

**Returns:** Whether the device is charging.

#### `isLowPowerMode()`

Check if the device has low power mode enabled.

```typescript
function isLowPowerMode(): Promise<boolean>
```

**Returns:** Whether low power mode is active.

#### `onChange(callback)`

Listen for battery status changes.

```typescript
function onChange(callback: (event: BatteryChangeEvent) => void): () => void
```

- `callback` — Called with a BatteryChangeEvent when level or charging state changes.

**Returns:** A function that unsubscribes the listener when called.

#### `onChargingChange(callback)`

Listen for charging state changes.

```typescript
function onChargingChange(callback: (isCharging: boolean) => void): () => void
```

- `callback` — Called with a boolean indicating whether the device started or stopped charging.

**Returns:** A function that unsubscribes the listener when called.

#### `onCritical(callback, threshold)`

Listen for critical battery events. Fires when level drops below the critical threshold.

```typescript
function onCritical(callback: (level: number) => void, threshold?: number): () => void
```

- `callback` — Called with the current battery level (0-1) when it drops below threshold.
- `threshold` — Battery level threshold (default: 0.05).

**Returns:** A function that unsubscribes the listener when called.

#### `onLow(callback, threshold)`

Listen for low battery events. Fires when level drops below the threshold.

```typescript
function onLow(callback: (level: number) => void, threshold?: number): () => void
```

- `callback` — Called with the current battery level (0-1) when it drops below threshold.
- `threshold` — Battery level threshold (default: 0.2).

**Returns:** A function that unsubscribes the listener when called.

#### `setProvider(provider)`

Set the battery provider

```typescript
function setProvider(provider: BatteryProvider): void
```

- `provider` — BatteryProvider implementation

#### `toPercentage(level)`

Convert battery level to percentage

```typescript
function toPercentage(level: number): number
```

- `level` — Battery level (0-1)

**Returns:** The battery level as a rounded integer percentage (0-100).

#### `waitForLevel(targetLevel, options, options, options)`

Wait for battery to reach a level

```typescript
function waitForLevel(targetLevel: number, options?: { timeout?: number; checkInterval?: number; }): Promise<boolean>
```

- `targetLevel` — Target level (0-1)
- `options` — Polling and timeout options
- `options` — .timeout - Maximum time to wait in milliseconds (0 for no timeout)
- `options` — .checkInterval - Interval between level checks in milliseconds

**Returns:** Whether the target level was reached before timeout.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-battery`.
