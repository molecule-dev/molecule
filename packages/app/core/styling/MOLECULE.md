# @molecule/app-styling

Styling interface and utilities for molecule.dev.

Framework-agnostic class-name merging ({@link cn}), variant generation
({@link cva}), and theme→CSS-variable conversion ({@link themeToCSS}) — the
low-level plumbing that styling bonds (e.g. `@molecule/app-styling-tailwind`)
and ClassMap bonds build on.

## Quick Start

```typescript
import { cn, cva } from '@molecule/app-styling'

// inside a ClassMap bond / shared-component plumbing:
cn('base', isActive && 'active', { disabled: isDisabled })
const button = cva('btn', { variants: { size: { sm: 'btn-sm', lg: 'btn-lg' } } })
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-styling
```

## API

### Interfaces

#### `CVAConfig`

Configuration for a class-variance-authority (`cva`) function: the variant
definitions, default selections, and compound variants used to resolve a
component's final class string from its props.

```typescript
interface CVAConfig<T extends Record<string, Record<string, string>>> {
  variants?: T
  defaultVariants?: { [K in keyof T]?: keyof T[K] }
  compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>
}
```

### Types

#### `ClassMerger`

A class-name merger: post-processes the joined class string produced by
`cn()` to resolve conflicts (e.g. `tailwind-merge`). Registered by a styling
bond via `setClassMerger` so the styling core stays framework-agnostic.

```typescript
type ClassMerger = (className: string) => string
```

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

When a class merger is registered via {@link setClassMerger} (e.g. the
Tailwind bond registers `tailwind-merge`), conflicting utilities such as two
`gap-*` classes are resolved by it; otherwise the joined string is returned
as-is.

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

#### `setClassMerger(merger)`

Registers the class-name merger used by {@link cn} to resolve conflicting
classes. Styling bonds call this at startup; pass `null` to clear it.

```typescript
function setClassMerger(merger: ClassMerger | null): void
```

- `merger` — Post-processes the joined class string, or `null` to disable merging.

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

## Injection Notes

- **This package does NOT license raw class names in app code.** CSS class
  STRINGS still live only inside ClassMap bond packages — application
  components style via `getClassMap()` / `cm.*` from `@molecule/app-ui`
  (compose with `cm.cn`). Reach for this package's `cn`/`cva` only when
  building a styling bond or shared-component infrastructure.
- **Conflict resolution requires a registered merger.** Bare {@link cn} just
  joins strings — two conflicting utilities (e.g. two `gap-*` classes) both
  survive. A styling bond registers its merger via {@link setClassMerger} at
  startup (the Tailwind bond registers `tailwind-merge`); without one, never
  rely on "last class wins".
- {@link themeToCSS} converts a theme object into CSS-variable pairs — pair
  it with `@molecule/app-theme` bonds instead of hand-writing variable maps.
