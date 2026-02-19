# @molecule/app-splash-screen

Splash screen control interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-splash-screen
```

## API

### Interfaces

#### `SplashScreenCapabilities`

Splash screen capabilities

```typescript
interface SplashScreenCapabilities {
  /** Whether splash screen control is supported */
  supported: boolean
  /** Whether spinner is supported */
  spinnerSupported: boolean
  /** Whether configuration is supported */
  configurable: boolean
  /** Whether background color can be changed */
  dynamicBackground: boolean
}
```

#### `SplashScreenConfig`

Splash screen configuration

```typescript
interface SplashScreenConfig {
  /** Background color */
  backgroundColor?: string
  /** Show spinner */
  showSpinner?: boolean
  /** Spinner color */
  spinnerColor?: string
  /** Android spinner style */
  androidSpinnerStyle?: 'horizontal' | 'small' | 'large'
  /** iOS spinner style */
  iosSpinnerStyle?: 'small' | 'large'
  /** Whether to auto-hide on app ready */
  autoHide?: boolean
  /** Duration in milliseconds before auto-hide */
  showDuration?: number
  /** Fade in duration in milliseconds */
  fadeInDuration?: number
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
  /** Scale mode for splash image */
  scaleMode?: 'fill' | 'aspectFill' | 'aspectFit' | 'center'
  /** Launch show duration (iOS) */
  launchShowDuration?: number
  /** Launch auto hide (iOS) */
  launchAutoHide?: boolean
}
```

#### `SplashScreenHideOptions`

Splash screen hide options

```typescript
interface SplashScreenHideOptions {
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
}
```

#### `SplashScreenProvider`

Splash screen provider interface

```typescript
interface SplashScreenProvider {
  /**
   * Show the splash screen
   * @param options - Show options
   */
  show(options?: SplashScreenShowOptions): Promise<void>

  /**
   * Hide the splash screen
   * @param options - Hide options
   */
  hide(options?: SplashScreenHideOptions): Promise<void>

  /**
   * Get current splash screen state
   */
  getState(): Promise<SplashScreenState>

  /**
   * Check if splash screen is visible
   */
  isVisible(): Promise<boolean>

  /**
   * Configure splash screen settings
   * @param config - Configuration options
   */
  configure?(config: SplashScreenConfig): Promise<void>

  /**
   * Get the platform's splash screen capabilities.
   * @returns The capabilities indicating splash screen control, spinner, and configuration support.
   */
  getCapabilities(): Promise<SplashScreenCapabilities>
}
```

#### `SplashScreenShowOptions`

Splash screen show options

```typescript
interface SplashScreenShowOptions {
  /** Whether to auto-hide after showDuration */
  autoHide?: boolean
  /** Duration in milliseconds before auto-hide */
  showDuration?: number
  /** Fade in duration in milliseconds */
  fadeInDuration?: number
  /** Fade out duration in milliseconds */
  fadeOutDuration?: number
}
```

#### `SplashScreenState`

Splash screen state

```typescript
interface SplashScreenState {
  /** Whether splash screen is currently visible */
  visible: boolean
  /** Whether currently animating */
  animating: boolean
}
```

### Functions

#### `configure(config)`

Configure splash screen appearance settings. Logs a warning if the provider
does not support configuration.

```typescript
function configure(config: SplashScreenConfig): Promise<void>
```

- `config` — Configuration including background color, spinner, and animation settings.

**Returns:** A promise that resolves when the configuration is applied.

#### `createSplashController()`

Create a task-based splash screen controller for complex multi-step loading scenarios.
Register tasks with `startTask()`, complete them with `completeTask()`. The splash
screen is automatically hidden when all registered tasks are complete.

```typescript
function createSplashController(): { startTask(taskId: string): void; completeTask(taskId: string, options?: SplashScreenHideOptions): Promise<void>; forceHide(options?: SplashScreenHideOptions): Promise<void>; getPendingCount(): number; isComplete(): boolean; reset(): void; }
```

**Returns:** A controller object with methods to manage loading tasks.

#### `getCapabilities()`

Get the platform's splash screen capabilities.

```typescript
function getCapabilities(): Promise<SplashScreenCapabilities>
```

**Returns:** The capabilities indicating splash screen control, spinner, and configuration support.

#### `getProvider()`

Get the current splash screen provider.

```typescript
function getProvider(): SplashScreenProvider
```

**Returns:** The active SplashScreenProvider instance.

#### `getState()`

Get the current splash screen state.

```typescript
function getState(): Promise<SplashScreenState>
```

**Returns:** The state including visibility and animation status.

#### `hasProvider()`

Check if a splash screen provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a SplashScreenProvider has been bonded.

#### `hide(options)`

Hide the splash screen with optional fade-out animation.

```typescript
function hide(options?: SplashScreenHideOptions): Promise<void>
```

- `options` — Hide options including fade-out duration.

**Returns:** A promise that resolves when the splash screen is hidden.

#### `hideWhenReady(condition, options)`

Hide the splash screen once a readiness condition is met.
Evaluates the condition immediately; hides only if it returns true.

```typescript
function hideWhenReady(condition: () => Promise<boolean> | boolean, options?: SplashScreenHideOptions): Promise<void>
```

- `condition` — Function returning whether the app is ready (sync or async).
- `options` — Fade-out animation options for hiding.

#### `isVisible()`

Check if the splash screen is currently visible.

```typescript
function isVisible(): Promise<boolean>
```

**Returns:** Whether the splash screen is showing.

#### `setProvider(provider)`

Set the splash screen provider.

```typescript
function setProvider(provider: SplashScreenProvider): void
```

- `provider` — SplashScreenProvider implementation to register.

#### `show(options)`

Show the splash screen with optional animation and auto-hide configuration.

```typescript
function show(options?: SplashScreenShowOptions): Promise<void>
```

- `options` — Show options including auto-hide, duration, and fade settings.

**Returns:** A promise that resolves when the splash screen is shown.

#### `showForMinDuration(minDuration, task, options)`

Run an async task while ensuring the splash screen stays visible for at least
`minDuration` milliseconds. Hides the splash after both the task completes and
the minimum duration elapses.

```typescript
function showForMinDuration(minDuration: number, task: () => Promise<T>, options?: SplashScreenHideOptions): Promise<T>
```

- `minDuration` — Minimum time in milliseconds to keep the splash screen visible.
- `task` — The async initialization task to run while splash is shown.
- `options` — Fade-out animation options for hiding.

**Returns:** The return value of the task.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-splash-screen`.
