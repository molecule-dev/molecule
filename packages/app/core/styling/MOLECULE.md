# @molecule/app-styling

Styling interface and utilities for molecule.dev.

Provides framework-agnostic class name merging, variant generation,
and theme conversion utilities. Provider bonds like
`@molecule/app-styling-tailwind`
extend this with framework-specific helpers.

## Type
`core`

## Installation
```bash
npm install @molecule/app-styling
```

## API

### Interfaces

#### `CVAConfig`

Configuration for class variance authority ({@link cva}).

```typescript
interface CVAConfig<T extends Record<string, Record<string, string>>> {
  variants?: T
  defaultVariants?: { [K in keyof T]?: keyof T[K] }
  compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>
}
```

### Types

#### `ClassValue`

Class name value types accepted by {@link cn}.

```typescript
type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined | null>
```

### Functions

#### `camelToKebab(str)`

Converts a camelCase string to kebab-case.

```typescript
function camelToKebab(str: string): string
```

- `str` — The camelCase string to convert.

**Returns:** The kebab-case version (e.g. `'borderRadius'` → `'border-radius'`).

#### `cn(classes)`

Merges class names, filtering out falsy values. Supports strings,
numbers, conditional objects, and nested arrays.

```typescript
function cn(classes?: ClassValue[]): string
```

- `classes` — Class values to merge (strings, booleans, objects, arrays).

**Returns:** A single space-separated class string.

#### `cva(base, config)`

Creates a class variance authority (CVA) function for component variants.
Given a base class and variant configuration, returns a function that
resolves the final class string based on selected variants.

```typescript
function cva(base: string, config?: CVAConfig<T>): (props?: { [K in keyof T]?: keyof T[K]; } & { class?: string; }) => string
```

- `base` — The base class that is always included.
- `config` — Variant definitions, defaults, and compound variants.

**Returns:** A function that accepts variant props and returns the resolved class string.

#### `themeToCSS(theme)`

Maps a molecule theme to CSS custom properties.

```typescript
function themeToCSS(theme: ThemeLike): Record<string, string>
```

- `theme` — A theme object with colors, spacing, typography, borderRadius, and shadows.

**Returns:** A flat record of CSS custom properties (e.g. `{ '--color-primary': '#3b82f6' }`).

## Available Providers

| Provider | Package |
|----------|---------|
| Tailwind CSS | `@molecule/app-styling-tailwind` |
