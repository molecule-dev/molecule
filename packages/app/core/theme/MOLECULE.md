# @molecule/app-theme

Theme interface and utilities for molecule.dev.

Provides a framework-agnostic theme interface that can be implemented
by various styling solutions (styled-components, Tailwind, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-theme
```

## API

### Interfaces

#### `Theme`

Complete theme definition.

```typescript
interface Theme {
  name: string
  mode: 'light' | 'dark'
  colors: ThemeColors
  breakpoints: ThemeBreakpoints
  spacing: ThemeSpacing
  typography: ThemeTypography
  borderRadius: ThemeBorderRadius
  shadows: ThemeShadows
  transitions: ThemeTransitions
  zIndex: ThemeZIndex
}
```

#### `ThemeBorderRadius`

Border radius scale.

```typescript
interface ThemeBorderRadius {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  full: string
}
```

#### `ThemeBreakpoints`

Responsive viewport breakpoints from mobileS (320px) to desktop (2560px).

```typescript
interface ThemeBreakpoints {
  mobileS: string // 320px
  mobileM: string // 375px
  mobileL: string // 425px
  tablet: string // 768px
  laptop: string // 1024px
  laptopL: string // 1440px
  desktop: string // 2560px
}
```

#### `ThemeColors`

Color palette definition.

```typescript
interface ThemeColors {
  // Base colors
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  surface: string
  surfaceSecondary: string
  inputBackground: string

  // Text colors
  text: string
  textSecondary: string
  textTertiary: string
  textInverse: string

  // Brand colors
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  secondaryLight: string
  secondaryDark: string

  // Semantic colors
  success: string
  successLight: string
  warning: string
  warningLight: string
  error: string
  errorLight: string
  info: string
  infoLight: string

  // Border colors
  border: string
  borderSecondary: string
  borderFocus: string

  // Other
  overlay: string
  shadow: string
}
```

#### `ThemeProvider`

Manages theme state including the active theme, mode toggling,
and change subscriptions.

```typescript
interface ThemeProvider {
  /**
   * Returns the currently active theme.
   */
  getTheme(): Theme

  /**
   * Sets the active theme by reference or by name.
   *
   * @param theme - A `Theme` object or a theme name string to activate.
   */
  setTheme(theme: Theme | string): void

  /**
   * Toggles between light and dark mode for the active theme.
   */
  toggleMode(): void

  /**
   * Subscribes to theme changes. The callback fires whenever
   * `setTheme()` or `toggleMode()` is called.
   *
   * @param callback - Invoked with the new theme after each change.
   * @returns An unsubscribe function.
   */
  subscribe(callback: (theme: Theme) => void): () => void

  /**
   * Returns all registered themes. Optional — not all providers
   * support multiple themes.
   */
  getThemes?(): Theme[]
}
```

#### `ThemeShadows`

Box-shadow scale from none to xl for elevation levels.

```typescript
interface ThemeShadows {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
}
```

#### `ThemeSpacing`

Theme spacing scale mapping size tokens (xs–3xl) to CSS values (e.g. '4px', '16px').

```typescript
interface ThemeSpacing {
  xs: string // 4px
  sm: string // 8px
  md: string // 16px
  lg: string // 24px
  xl: string // 32px
  xxl: string // 48px
  xxxl: string // 64px
}
```

#### `ThemeTransitions`

CSS transition duration presets (fast, normal, slow).

```typescript
interface ThemeTransitions {
  fast: string
  normal: string
  slow: string
}
```

#### `ThemeTypography`

Typography scale (font families, sizes, weights, and line heights).

```typescript
interface ThemeTypography {
  fontFamily: {
    sans: string
    serif: string
    mono: string
  }
  fontSize: {
    xs: string // 12px
    sm: string // 14px
    base: string // 16px
    lg: string // 18px
    xl: string // 20px
    '2xl': string // 24px
    '3xl': string // 30px
    '4xl': string // 36px
    '5xl': string // 48px
  }
  fontWeight: {
    light: number
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
}
```

#### `ThemeZIndex`

Theme z-index scale for layering UI elements (dropdowns, modals, toasts, etc.).

```typescript
interface ThemeZIndex {
  hide: number
  base: number
  dropdown: number
  sticky: number
  fixed: number
  modal: number
  popover: number
  tooltip: number
  toast: number
}
```

### Functions

#### `createDarkTheme(overrides)`

Creates a dark theme by merging default dark-mode tokens with
optional overrides for colors, spacing, typography, etc.

```typescript
function createDarkTheme(overrides?: Partial<Theme>): Theme
```

- `overrides` — Partial theme tokens to merge over the defaults.

**Returns:** A complete `Theme` object with `mode: 'dark'`.

#### `createLightTheme(overrides)`

Creates a light theme by merging default light-mode tokens with
optional overrides for colors, spacing, typography, etc.

```typescript
function createLightTheme(overrides?: Partial<Theme>): Theme
```

- `overrides` — Partial theme tokens to merge over the defaults.

**Returns:** A complete `Theme` object with `mode: 'light'`.

#### `getProvider()`

Retrieves the bonded theme provider, or `null` if none is configured.

```typescript
function getProvider(): ThemeProvider | null
```

**Returns:** The bonded theme provider, or `null`.

#### `hasProvider()`

Checks whether a theme provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a theme provider is bonded.

#### `setProvider(provider)`

Registers a theme provider as the active singleton.

```typescript
function setProvider(provider: ThemeProvider): void
```

- `provider` — The theme provider implementation to bond.

### Constants

#### `darkColors`

Default dark theme colors.

```typescript
const darkColors: ThemeColors
```

#### `darkTheme`

Default dark theme.

```typescript
const darkTheme: Theme
```

#### `defaultBorderRadius`

Default border radius.

```typescript
const defaultBorderRadius: ThemeBorderRadius
```

#### `defaultBreakpoints`

Default responsive breakpoints (320px mobileS → 2560px desktop).

```typescript
const defaultBreakpoints: ThemeBreakpoints
```

#### `defaultShadows`

Default box-shadow scale (none → xl, rgba-based).

```typescript
const defaultShadows: ThemeShadows
```

#### `defaultSpacing`

Default spacing scale (4px xs → 64px xxxl).

```typescript
const defaultSpacing: ThemeSpacing
```

#### `defaultTransitions`

Default CSS transition durations (150ms fast, 250ms normal, 350ms slow).

```typescript
const defaultTransitions: ThemeTransitions
```

#### `defaultTypography`

Default typography scale (system font stacks, rem-based sizes, weight/line-height presets).

```typescript
const defaultTypography: ThemeTypography
```

#### `defaultZIndex`

Default z-index scale.

```typescript
const defaultZIndex: ThemeZIndex
```

#### `lightColors`

Default light theme colors.

```typescript
const lightColors: ThemeColors
```

#### `lightTheme`

Default light theme.

```typescript
const lightTheme: Theme
```

## Available Providers

| Provider | Package |
|----------|---------|
| CSS Variables | `@molecule/app-theme-css-variables` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
