# @molecule/app-theme-css-variables

CSS custom properties theme provider for molecule.dev.

Provides a framework-agnostic ThemeProvider implementation that applies
theme tokens as CSS custom properties (variables) to the document root.
Works with any framework -- React, Vue, Svelte, Angular, Solid, or vanilla JS.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-theme-css-variables
```

## Usage

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
  /** Key for persisting theme preference. Requires `storage` to be set. */
  persistKey?: string
  /** Storage adapter for persisting theme preference. When omitted, persistence is disabled. */
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

White backgrounds, dark text, blue primary (#3b82f6).

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-theme` ^1.0.0
