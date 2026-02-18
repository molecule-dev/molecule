# @molecule/app-status-bar

Status bar customization interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-status-bar
```

## API

### Interfaces

#### `StatusBarCapabilities`

Status bar capabilities

```typescript
interface StatusBarCapabilities {
  /** Whether status bar control is supported */
  supported: boolean
  /** Whether background color can be set */
  canSetBackgroundColor: boolean
  /** Whether style can be set */
  canSetStyle: boolean
  /** Whether visibility can be controlled */
  canSetVisibility: boolean
  /** Whether overlay mode can be set */
  canSetOverlay: boolean
  /** Whether animations are supported */
  supportsAnimation: boolean
}
```

#### `StatusBarConfig`

Status bar configuration

```typescript
interface StatusBarConfig {
  /** Background color (hex or named color) */
  backgroundColor?: string
  /** Content style (dark/light icons and text) */
  style?: StatusBarStyle
  /** Whether status bar is visible */
  visible?: boolean
  /** Whether content overlays status bar */
  overlaysWebView?: boolean
}
```

#### `StatusBarProvider`

Status bar provider interface

```typescript
interface StatusBarProvider {
  /**
   * Set background color
   * @param color - Hex color (e.g., '#ffffff') or named color
   */
  setBackgroundColor(color: string): Promise<void>

  /**
   * Set content style (dark/light icons)
   * @param style - Status bar style
   */
  setStyle(style: StatusBarStyle): Promise<void>

  /**
   * Show the status bar
   * @param animation - Animation type (iOS)
   */
  show(animation?: StatusBarAnimation): Promise<void>

  /**
   * Hide the status bar
   * @param animation - Animation type (iOS)
   */
  hide(animation?: StatusBarAnimation): Promise<void>

  /**
   * Set whether content overlays the status bar
   * @param overlay - Whether to overlay
   */
  setOverlaysWebView(overlay: boolean): Promise<void>

  /**
   * Get current status bar state
   */
  getState(): Promise<StatusBarState>

  /**
   * Get status bar height
   */
  getHeight(): Promise<number>

  /**
   * Apply multiple settings at once
   * @param config - Status bar configuration
   */
  configure(config: StatusBarConfig): Promise<void>

  /**
   * Get the platform's status bar capabilities.
   * @returns The capabilities indicating which status bar features are supported.
   */
  getCapabilities(): Promise<StatusBarCapabilities>
}
```

#### `StatusBarState`

Status bar state

```typescript
interface StatusBarState {
  /** Whether status bar is visible */
  visible: boolean
  /** Current background color */
  backgroundColor: string
  /** Current content style */
  style: StatusBarStyle
  /** Whether content overlays status bar */
  overlaysWebView: boolean
  /** Status bar height in pixels */
  height: number
}
```

### Types

#### `StatusBarAnimation`

Status bar animation type

```typescript
type StatusBarAnimation = 'none' | 'fade' | 'slide'
```

#### `StatusBarStyle`

Status bar style (content color)

```typescript
type StatusBarStyle = 'dark' | 'light' | 'default'
```

### Functions

#### `applyPreset(preset)`

Apply a named preset configuration to the status bar.

```typescript
function applyPreset(preset: "dark" | "light" | "transparent" | "hidden"): Promise<void>
```

- `preset` — The preset name: 'light', 'dark', 'transparent', or 'hidden'.

**Returns:** A promise that resolves when the preset is applied.

#### `configure(config)`

Apply multiple status bar settings at once (color, style, visibility, overlay).

```typescript
function configure(config: StatusBarConfig): Promise<void>
```

- `config` — The status bar configuration to apply.

**Returns:** A promise that resolves when all settings are applied.

#### `getCapabilities()`

Get the platform's status bar capabilities.

```typescript
function getCapabilities(): Promise<StatusBarCapabilities>
```

**Returns:** The capabilities indicating which status bar features are supported.

#### `getHeight()`

Get the current status bar height in pixels.

```typescript
function getHeight(): Promise<number>
```

**Returns:** The status bar height in pixels.

#### `getProvider()`

Get the current status bar provider.

```typescript
function getProvider(): StatusBarProvider
```

**Returns:** The active StatusBarProvider instance.

#### `getSafeAreaInsetTop()`

Get the CSS environment variable value for the top safe area inset,
with a fallback of 0px. Useful for positioning content below the status bar.

```typescript
function getSafeAreaInsetTop(): string
```

**Returns:** A CSS `env(safe-area-inset-top)` expression string.

#### `getState()`

Get the current status bar state including visibility, color, style, and height.

```typescript
function getState(): Promise<StatusBarState>
```

**Returns:** The full status bar state.

#### `hasProvider()`

Check if a status bar provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a StatusBarProvider has been bonded.

#### `hide(animation)`

Hide the status bar with an optional animation.

```typescript
function hide(animation?: StatusBarAnimation): Promise<void>
```

- `animation` — Animation type for hiding: 'none', 'fade', or 'slide' (iOS only).

**Returns:** A promise that resolves when the status bar is hidden.

#### `isLightColor(color)`

Check if a color is light (for determining text color)

```typescript
function isLightColor(color: string): boolean
```

- `color` — Hex color

**Returns:** Whether light color.

#### `matchColor(color)`

Make status bar match a color (auto-detect style)

```typescript
function matchColor(color: string): Promise<void>
```

- `color` — Hex color to match

#### `setBackgroundColor(color)`

Set the status bar background color.

```typescript
function setBackgroundColor(color: string): Promise<void>
```

- `color` — Hex color (e.g., '#ffffff') or named color.

**Returns:** A promise that resolves when the color is set.

#### `setDarkTheme(backgroundColor)`

Set status bar for dark theme

```typescript
function setDarkTheme(backgroundColor?: string): Promise<void>
```

- `backgroundColor` — Optional background color (default: black)

#### `setLightTheme(backgroundColor)`

Set status bar for light theme

```typescript
function setLightTheme(backgroundColor?: string): Promise<void>
```

- `backgroundColor` — Optional background color (default: white)

#### `setOverlaysWebView(overlay)`

Set whether app content overlays (renders behind) the status bar.

```typescript
function setOverlaysWebView(overlay: boolean): Promise<void>
```

- `overlay` — Whether content should extend behind the status bar.

**Returns:** A promise that resolves when the overlay setting is applied.

#### `setProvider(provider)`

Set the status bar provider.

```typescript
function setProvider(provider: StatusBarProvider): void
```

- `provider` — StatusBarProvider implementation to register.

#### `setStyle(style)`

Set the status bar content style (dark or light icons and text).

```typescript
function setStyle(style: StatusBarStyle): Promise<void>
```

- `style` — The content style: 'dark' for dark icons, 'light' for light icons, or 'default'.

**Returns:** A promise that resolves when the style is set.

#### `show(animation)`

Show the status bar with an optional animation.

```typescript
function show(animation?: StatusBarAnimation): Promise<void>
```

- `animation` — Animation type for showing: 'none', 'fade', or 'slide' (iOS only).

**Returns:** A promise that resolves when the status bar is shown.

### Constants

#### `presets`

Preset status bar configurations

```typescript
const presets: { readonly light: { readonly backgroundColor: "#ffffff"; readonly style: StatusBarStyle; readonly visible: true; readonly overlaysWebView: false; }; readonly dark: { readonly backgroundColor: "#000000"; readonly style: StatusBarStyle; readonly visible: true; readonly overlaysWebView: false; }; readonly transparent: { readonly backgroundColor: "#00000000"; readonly style: StatusBarStyle; readonly visible: true; readonly overlaysWebView: true; }; readonly hidden: { readonly visible: false; }; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-status-bar`.
