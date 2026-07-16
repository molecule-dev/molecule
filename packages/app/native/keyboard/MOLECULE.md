# @molecule/app-keyboard

On-screen (software) keyboard handling interface for molecule.dev.

Framework-agnostic core for managing the mobile soft keyboard through a
swappable `KeyboardProvider`: hide/show, visibility + height state,
show/hide/height-change events, resize behavior, and DOM helpers
(`hideOnOutsideClick`, `createKeyboardAwareContainer`).

This is NOT hotkeys/shortcuts — for desktop keyboard shortcuts use
`@molecule/app-keyboard-shortcuts`.

## Quick Start

```typescript
import {
  getCapabilities,
  hasProvider,
  hide,
  onShow,
  onHide,
} from '@molecule/app-keyboard'

function wireKeyboardAwareFooter(setPadding: (px: number) => void): () => void {
  if (!hasProvider()) return () => {} // web/desktop: no soft keyboard
  const offShow = onShow((e) => setPadding(e.keyboardHeight))
  const offHide = onHide(() => setPadding(0))
  return () => {
    offShow()
    offHide()
  }
}

async function submitAndDismiss(): Promise<void> {
  if (hasProvider()) await hide()
}
```

## Type
`native`

## Installation
```bash
npm install @molecule/app-keyboard @molecule/app-bond @molecule/app-i18n @molecule/app-logger
```

## API

### Interfaces

#### `AccessoryBarOptions`

Keyboard accessory bar visibility

```typescript
interface AccessoryBarOptions {
  /** Show/hide accessory bar (iOS) */
  visible: boolean
}
```

#### `KeyboardCapabilities`

Keyboard capabilities

```typescript
interface KeyboardCapabilities {
  /** Whether keyboard control is supported */
  supported: boolean
  /** Whether programmatic show/hide is supported */
  canShowHide: boolean
  /** Whether resize mode can be set */
  canSetResizeMode: boolean
  /** Whether style can be set (iOS) */
  canSetStyle: boolean
  /** Whether accessory bar can be controlled */
  canControlAccessoryBar: boolean
  /** Whether scroll behavior can be controlled */
  canControlScroll: boolean
}
```

#### `KeyboardHideEvent`

Keyboard hide event

```typescript
interface KeyboardHideEvent {
  /** Animation duration in milliseconds (iOS) */
  animationDuration?: number
  /** Animation curve (iOS) */
  animationCurve?: string
}
```

#### `KeyboardProvider`

Keyboard provider interface

```typescript
interface KeyboardProvider {
  /**
   * Show the keyboard
   */
  show(): Promise<void>

  /**
   * Hide the keyboard
   */
  hide(): Promise<void>

  /**
   * Toggle keyboard visibility
   */
  toggle(): Promise<void>

  /**
   * Get current keyboard state
   */
  getState(): Promise<KeyboardState>

  /**
   * Check if keyboard is visible
   */
  isVisible(): Promise<boolean>

  /**
   * Set resize mode
   * @param mode - How the app should resize when keyboard appears
   */
  setResizeMode(mode: KeyboardResizeMode): Promise<void>

  /**
   * Set keyboard style (iOS)
   * @param style - Keyboard color scheme
   */
  setStyle(style: KeyboardStyle): Promise<void>

  /**
   * Set accessory bar visibility (iOS)
   * @param options - Accessory bar options
   */
  setAccessoryBar(options: AccessoryBarOptions): Promise<void>

  /**
   * Set scroll behavior
   * @param options - Scroll options
   */
  setScroll(options: KeyboardScrollOptions): Promise<void>

  /**
   * Listen for keyboard show events
   * @param callback - Called when keyboard is shown
   * @returns Unsubscribe function
   */
  onShow(callback: (event: KeyboardShowEvent) => void): () => void

  /**
   * Listen for keyboard hide events
   * @param callback - Called when keyboard is hidden
   * @returns Unsubscribe function
   */
  onHide(callback: (event: KeyboardHideEvent) => void): () => void

  /**
   * Listen for keyboard height changes
   * @param callback - Called when keyboard height changes
   * @returns Unsubscribe function
   */
  onHeightChange?(callback: (height: number) => void): () => void

  /**
   * Get the platform's keyboard control capabilities.
   * @returns The capabilities indicating which keyboard features are supported.
   */
  getCapabilities(): Promise<KeyboardCapabilities>
}
```

#### `KeyboardScrollOptions`

Keyboard scroll options

```typescript
interface KeyboardScrollOptions {
  /** Enable scroll to input on focus */
  enabled: boolean
  /** Extra padding above keyboard */
  padding?: number
}
```

#### `KeyboardShowEvent`

Keyboard show event

```typescript
interface KeyboardShowEvent {
  /** Keyboard height in pixels */
  keyboardHeight: number
  /** Animation duration in milliseconds (iOS) */
  animationDuration?: number
  /** Animation curve (iOS) */
  animationCurve?: string
}
```

#### `KeyboardState`

Keyboard visibility state

```typescript
interface KeyboardState {
  /** Whether keyboard is visible */
  isVisible: boolean
  /** Keyboard height in pixels */
  height: number
  /** Screen height without keyboard */
  screenHeight: number
}
```

### Types

#### `KeyboardResizeMode`

Keyboard resize mode

```typescript
type KeyboardResizeMode =
  | 'body' // Resize the body element
  | 'native' // Native resize (default)
  | 'ionic' // Ionic-specific resize
  | 'none'
```

#### `KeyboardStyle`

Keyboard style (iOS)

```typescript
type KeyboardStyle = 'dark' | 'light' | 'default'
```

### Functions

#### `createKeyboardAwareContainer(paddingProperty)`

Create a keyboard-aware container that adjusts its padding or margin when the keyboard appears.

```typescript
function createKeyboardAwareContainer(paddingProperty?: "paddingBottom" | "marginBottom"): { enable(element: HTMLElement): void; disable(): void; }
```

- `paddingProperty` — The CSS property to adjust: 'paddingBottom' or 'marginBottom' (default: 'paddingBottom').

**Returns:** A controller with `enable` and `disable` methods to manage keyboard-aware behavior.

#### `getCapabilities()`

Get the platform's keyboard control capabilities.

```typescript
function getCapabilities(): Promise<KeyboardCapabilities>
```

**Returns:** The capabilities indicating which keyboard features are supported.

#### `getProvider()`

Get the current keyboard provider.

```typescript
function getProvider(): KeyboardProvider
```

**Returns:** The active KeyboardProvider instance.

#### `getState()`

Get the current keyboard state (visibility and height).

```typescript
function getState(): Promise<KeyboardState>
```

**Returns:** The keyboard state including visibility, height, and screen height.

#### `hasProvider()`

Check if a keyboard provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a KeyboardProvider has been bonded.

#### `hide()`

Programmatically hide the soft keyboard.

```typescript
function hide(): Promise<void>
```

**Returns:** A promise that resolves when the keyboard is hidden.

#### `hideOnOutsideClick(element)`

Automatically hide the keyboard when the user clicks outside of input elements.

```typescript
function hideOnOutsideClick(element?: HTMLElement): () => void
```

- `element` — The element to attach the click listener to (default: document).

**Returns:** A function that removes the click listener when called.

#### `isVisible()`

Check if the soft keyboard is currently visible.

```typescript
function isVisible(): Promise<boolean>
```

**Returns:** Whether the keyboard is visible.

#### `onHeightChange(callback)`

Listen for keyboard height changes (if supported by the provider).

```typescript
function onHeightChange(callback: (height: number) => void): () => void
```

- `callback` — Called with the new keyboard height in pixels.

**Returns:** A function that unsubscribes the listener when called.

#### `onHide(callback)`

Listen for keyboard hide events.

```typescript
function onHide(callback: (event: KeyboardHideEvent) => void): () => void
```

- `callback` — Called with animation details when the keyboard is dismissed.

**Returns:** A function that unsubscribes the listener when called.

#### `onShow(callback)`

Listen for keyboard show events.

```typescript
function onShow(callback: (event: KeyboardShowEvent) => void): () => void
```

- `callback` — Called with keyboard height and animation details when the keyboard appears.

**Returns:** A function that unsubscribes the listener when called.

#### `setAccessoryBar(options)`

Show or hide the keyboard accessory bar (iOS only).

```typescript
function setAccessoryBar(options: AccessoryBarOptions): Promise<void>
```

- `options` — Accessory bar visibility options.

**Returns:** A promise that resolves when the accessory bar setting is applied.

#### `setProvider(provider)`

Set the keyboard provider.

```typescript
function setProvider(provider: KeyboardProvider): void
```

- `provider` — KeyboardProvider implementation to register.

#### `setResizeMode(mode)`

Set how the app viewport should resize when the keyboard appears.

```typescript
function setResizeMode(mode: KeyboardResizeMode): Promise<void>
```

- `mode` — The resize mode: 'body', 'native', 'ionic', or 'none'.

**Returns:** A promise that resolves when the resize mode is set.

#### `setScroll(options)`

Configure scroll-to-input behavior when the keyboard appears.

```typescript
function setScroll(options: KeyboardScrollOptions): Promise<void>
```

- `options` — Scroll options (enabled, extra padding).

**Returns:** A promise that resolves when the scroll setting is applied.

#### `setStyle(style)`

Set the keyboard color scheme (iOS only).

```typescript
function setStyle(style: KeyboardStyle): Promise<void>
```

- `style` — The keyboard style: 'dark', 'light', or 'default'.

**Returns:** A promise that resolves when the keyboard style is set.

#### `show()`

Programmatically show the soft keyboard.

```typescript
function show(): Promise<void>
```

**Returns:** A promise that resolves when the keyboard is shown.

#### `toggle()`

Toggle the soft keyboard visibility.

```typescript
function toggle(): Promise<void>
```

**Returns:** A promise that resolves when the keyboard visibility is toggled.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`
- `@molecule/app-logger`

- **Every accessor THROWS until `setProvider()` is called.** The one
  prebuilt bond is `@molecule/app-keyboard-react-native`; **web has no
  bond** — browsers expose no soft-keyboard API (focus/blur inputs
  instead), so on web leave this unwired and gate on `hasProvider()`.
- **Do not assume the full surface works on any given provider** — check
  `getCapabilities()` first. Notably, the react-native bond's `show()` is
  a NO-OP (platforms can't summon the keyboard programmatically — focus a
  text input instead) and its `setResizeMode`/`setStyle`/
  `setAccessoryBar`/`setScroll` are no-ops configured natively at build
  time; it reports all of these `false` in capabilities.
- Event subscriptions (`onShow`/`onHide`/`onHeightChange`) return
  unsubscribe functions — always call them on unmount or listeners leak
  across screens.

## Translations

Translation strings are provided by `@molecule/app-locales-keyboard`.
