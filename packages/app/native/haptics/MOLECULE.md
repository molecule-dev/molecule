# @molecule/app-haptics

Haptic feedback interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-haptics
```

## API

### Interfaces

#### `HapticCapabilities`

Haptic capabilities on the current device

```typescript
interface HapticCapabilities {
  /** Whether haptics are supported */
  supported: boolean
  /** Whether impact feedback is available */
  impactFeedback: boolean
  /** Whether notification feedback is available */
  notificationFeedback: boolean
  /** Whether selection feedback is available */
  selectionFeedback: boolean
  /** Whether custom patterns are supported */
  customPatterns: boolean
}
```

#### `HapticPatternElement`

Haptic pattern element for custom patterns

```typescript
interface HapticPatternElement {
  /** Type of haptic event */
  type: 'impact' | 'pause'
  /** Style for impact events */
  style?: ImpactStyle
  /** Duration in milliseconds for pause events */
  duration?: number
}
```

#### `HapticsProvider`

Haptics provider interface

```typescript
interface HapticsProvider {
  /**
   * Trigger impact feedback
   * @param style - Impact style (default: 'medium')
   */
  impact(style?: ImpactStyle): Promise<void>

  /**
   * Trigger notification feedback
   * @param type - Notification type (default: 'success')
   */
  notification(type?: NotificationType): Promise<void>

  /**
   * Trigger selection feedback (light tap for UI selections)
   */
  selection(): Promise<void>

  /**
   * Vibrate for a specified duration
   * @param duration - Duration in milliseconds (default: 300)
   */
  vibrate(duration?: number): Promise<void>

  /**
   * Play a custom haptic pattern
   * @param pattern - Array of haptic pattern elements
   */
  playPattern(pattern: HapticPatternElement[]): Promise<void>

  /**
   * Check if haptics are supported on the current device
   * @returns Whether haptic feedback is supported.
   */
  isSupported(): Promise<boolean>

  /**
   * Get haptic capabilities for the current device
   * @returns The available haptic capabilities.
   */
  getCapabilities(): Promise<HapticCapabilities>
}
```

### Types

#### `ImpactStyle`

Impact feedback styles - for button presses, collisions, etc.

```typescript
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
```

#### `NotificationType`

Notification feedback types - for success/warning/error states

```typescript
type NotificationType = 'success' | 'warning' | 'error'
```

### Functions

#### `getCapabilities()`

Gets the haptic capabilities for the current device.

```typescript
function getCapabilities(): Promise<HapticCapabilities>
```

**Returns:** The available haptic capabilities.

#### `getProvider()`

Get the current haptics provider.

```typescript
function getProvider(): HapticsProvider
```

**Returns:** The active haptics provider instance.

#### `hasProvider()`

Checks if a haptics provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a haptics provider is currently registered.

#### `impact(style)`

Triggers impact haptic feedback.

```typescript
function impact(style?: ImpactStyle): Promise<void>
```

- `style` — Impact intensity style (default: 'medium').

**Returns:** A promise that resolves when the haptic feedback is triggered.

#### `isSupported()`

Checks if haptics are supported on the current device.

```typescript
function isSupported(): Promise<boolean>
```

**Returns:** Whether haptic feedback is supported.

#### `notification(type)`

Triggers notification haptic feedback.

```typescript
function notification(type?: NotificationType): Promise<void>
```

- `type` — Notification feedback type (default: 'success').

**Returns:** A promise that resolves when the haptic feedback is triggered.

#### `playPattern(pattern)`

Plays a custom haptic pattern sequence.

```typescript
function playPattern(pattern: HapticPatternElement[]): Promise<void>
```

- `pattern` — Array of haptic pattern elements defining the sequence.

**Returns:** A promise that resolves when the pattern finishes playing.

#### `selection()`

Triggers selection haptic feedback (light tap for UI selections).

```typescript
function selection(): Promise<void>
```

**Returns:** A promise that resolves when the haptic feedback is triggered.

#### `setProvider(provider)`

Set the haptics provider

```typescript
function setProvider(provider: HapticsProvider): void
```

- `provider` — HapticsProvider implementation

#### `vibrate(duration)`

Vibrates the device for a specified duration.

```typescript
function vibrate(duration?: number): Promise<void>
```

- `duration` — Duration in milliseconds (default: 300).

**Returns:** A promise that resolves when the vibration completes.

### Constants

#### `patterns`

Preset haptic patterns for common use cases

```typescript
const patterns: { readonly doubleTap: HapticPatternElement[]; readonly tripleTap: HapticPatternElement[]; readonly success: HapticPatternElement[]; readonly error: HapticPatternElement[]; readonly warning: HapticPatternElement[]; readonly heartbeat: HapticPatternElement[]; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-haptics`.
