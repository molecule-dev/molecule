# @molecule/app-theme-css-variables

CSS custom properties theme provider for molecule.dev.

Provides a framework-agnostic ThemeProvider implementation that applies
theme tokens as CSS custom properties (variables) to the document root.
Works with any framework -- React, Vue, Svelte, Angular, Solid, or vanilla JS.

## Quick Start

```typescript
import {
  createCSSVariablesThemeProvider,
  lightTheme,
  darkTheme,
} from '@molecule/app-theme-css-variables'
import { setProvider } from '@molecule/app-theme'

const provider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  persistKey: 'molecule-theme',
})

setProvider(provider)
```

Then use CSS variables in your stylesheets:
```css
.button {
  background-color: var(--mol-color-primary);
  color: var(--mol-color-text-inverse);
  padding: var(--mol-spacing-sm) var(--mol-spacing-md);
  border-radius: var(--mol-radius-md);
  transition: background-color var(--mol-transition-fast);
}
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-theme-css-variables @molecule/app-theme
```

## API

### Interfaces

#### `CSSVariablesThemeConfig`

Configuration for css variables theme.

```typescript
interface CSSVariablesThemeConfig {
  /** Available themes. */
  themes: Theme[]
  /** Name of the default theme to use. */
  defaultTheme?: string
  /** CSS variable prefix (default: 'mol'). */
  prefix?: string
  /** Whether to auto-apply CSS variables to :root (default: true). */
  applyToDocument?: boolean
  /**
   * Key for persisting the selected theme name across reloads. When `storage`
   * is omitted, persistence falls back to `window.localStorage` in browser
   * environments; in SSR / non-browser environments persistence is skipped.
   */
  persistKey?: string
  /**
   * Storage adapter for persisting theme preference. Optional — when omitted
   * and `persistKey` is set, `window.localStorage` is used when available.
   * Provide an adapter for React Native (AsyncStorage wrapper) or custom stores.
   */
  storage?: ThemeStorageAdapter
}
```

#### `ThemeStorageAdapter`

Minimal storage adapter for theme persistence. Compatible with
localStorage, sessionStorage, or any custom implementation
(e.g., React Native AsyncStorage wrapper, SSR no-op).

```typescript
interface ThemeStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
```

### Functions

#### `createCSSVariablesThemeProvider(config)`

Creates a framework-agnostic ThemeProvider that applies theme tokens
as CSS custom properties on the document root element.

```typescript
function createCSSVariablesThemeProvider(config: CSSVariablesThemeConfig): ThemeProvider
```

- `config` — Theme provider configuration (available themes, default theme, CSS variable prefix, persistence).

**Returns:** A ThemeProvider that applies themes as CSS custom properties on the document root.

### Constants

#### `darkTheme`

Default dark theme.

Dark backgrounds (#0f172a, #1e293b), light text, blue primary (#60a5fa).

```typescript
const darkTheme: Theme
```

#### `lightTheme`

Default light theme.

Near-white backgrounds (#f6f6f6 background, #ffffff surface), dark text,
blue primary (#4070e0).

```typescript
const lightTheme: Theme
```

#### `provider`

Default CSS variables theme provider with light and dark themes.

```typescript
const provider: ThemeProvider
```

## Core Interface
Implements `@molecule/app-theme` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-theme'
import { provider } from '@molecule/app-theme-css-variables'

export function setupThemeCssVariables(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-theme` ^1.0.0

### Runtime Dependencies

- `@molecule/app-theme`

Recoloring a scaffolded app — where the palette actually lives:

This bond writes `--mol-color-*` variables and toggles light/dark via a
`data-mol-mode` attribute. In `@molecule/app-ui-tailwind`'s `base.css` the
Tailwind `@theme` reads each core token as
`--color-primary: var(--mol-color-primary, <default>)`, so for a CUSTOM build
(no per-app `theme.css`) this bond's `Theme` objects ARE the palette — edit
`colors` here to recolor.

BUT template-based apps ship `app/src/theme.css` that hardcodes `--color-*` on
`:root` / `[data-mol-mode='dark']`. Those have the same `:root` specificity and
load last, so they SHADOW the `var(--mol-color-*)` reference — the visible
colors come only from `theme.css`. When `theme.css` defines colors, editing
this bond has NO visible effect; recolor by editing `app/src/theme.css`. This
bond still drives light/dark mode and is the palette for non-Tailwind targets
(e.g. React Native). Precedence: `theme.css` > this bond > base defaults.

The provider also toggles a `.dark` class on `<html>` (alongside the
`data-mol-mode` attribute) so Tailwind `dark:` variants react to theme
toggles — if `dark:` utilities aren't switching, check that this bond is
wired and applying to the document.
