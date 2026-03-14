# @molecule/app-theme-css-variables-liquid-glass

Liquid glass theme preset for molecule.dev.

Provides translucent, frosted-glass-inspired light and dark themes
designed to pair with backdrop-filter blur effects. Uses the standard
CSS custom properties provider from `@molecule/app-theme-css-variables`.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-theme-css-variables-liquid-glass
```

## Usage

```typescript
import { createCSSVariablesThemeProvider, lightTheme, darkTheme } from '@molecule/app-theme-css-variables-liquid-glass'
import { setProvider } from '@molecule/app-theme'

const provider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
})

setProvider(provider)
```

## API

### Interfaces

#### `CSSVariablesThemeConfig`

Configuration for css variables theme.

```typescript
interface CSSVariablesThemeConfig {
    /** Available themes. */
    themes: Theme[];
    /** Name of the default theme to use. */
    defaultTheme?: string;
    /** CSS variable prefix (default: 'mol'). */
    prefix?: string;
    /** Whether to auto-apply CSS variables to :root (default: true). */
    applyToDocument?: boolean;
    /** Key for persisting theme preference. Requires `storage` to be set. */
    persistKey?: string;
    /** Storage adapter for persisting theme preference. When omitted, persistence is disabled. */
    storage?: ThemeStorageAdapter;
}
```

#### `ThemeStorageAdapter`

Minimal storage adapter for theme persistence. Compatible with
localStorage, sessionStorage, or any custom implementation
(e.g., React Native AsyncStorage wrapper, SSR no-op).

```typescript
interface ThemeStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
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

Liquid glass dark theme.

Translucent dark surfaces over blurred backgrounds.

```typescript
const darkTheme: Theme
```

#### `lightTheme`

Liquid glass light theme.

Translucent white surfaces over blurred backgrounds.

```typescript
const lightTheme: Theme
```

## Core Interface
Implements `@molecule/app-theme` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-theme` ^1.0.0
- `@molecule/app-theme-css-variables` ^1.0.0
