# @molecule/app-styling-tailwind

Tailwind CSS styling utilities for molecule.dev.

Provides utility functions for working with Tailwind CSS classes,
theme mapping, and dynamic class generation.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-styling-tailwind
```

## API

### Interfaces

#### `CVAConfig`

Configuration for class variance authority ({@link cva}).

```typescript
interface CVAConfig<T extends Record<string, Record<string, string>>> {
    variants?: T;
    defaultVariants?: {
        [K in keyof T]?: keyof T[K];
    };
    compoundVariants?: Array<{
        [K in keyof T]?: keyof T[K];
    } & {
        class: string;
    }>;
}
```

#### `Theme`

Complete theme definition.

```typescript
interface Theme {
    name: string;
    mode: 'light' | 'dark';
    colors: ThemeColors;
    breakpoints: ThemeBreakpoints;
    spacing: ThemeSpacing;
    typography: ThemeTypography;
    borderRadius: ThemeBorderRadius;
    shadows: ThemeShadows;
    transitions: ThemeTransitions;
    zIndex: ThemeZIndex;
}
```

#### `ThemeBreakpoints`

Responsive viewport breakpoints from mobileS (320px) to desktop (2560px).

```typescript
interface ThemeBreakpoints {
    mobileS: string;
    mobileM: string;
    mobileL: string;
    tablet: string;
    laptop: string;
    laptopL: string;
    desktop: string;
}
```

### Types

#### `ClassValue`

Class name value types accepted by {@link cn}.

```typescript
type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, boolean | undefined | null>;
```

### Functions

#### `active(classes)`

Prefixes each class with `active:` for Tailwind active (pressed) state.

```typescript
function active(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `active:`-prefixed classes.

#### `dark(classes)`

Prefixes each class with `dark:` for Tailwind dark mode.

```typescript
function dark(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `dark:`-prefixed classes.

#### `disabled(classes)`

Prefixes each class with `disabled:` for Tailwind disabled state.

```typescript
function disabled(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `disabled:`-prefixed classes.

#### `focus(classes)`

Prefixes each class with `focus:` for Tailwind focus state.

```typescript
function focus(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `focus:`-prefixed classes.

#### `groupHover(classes)`

Prefixes each class with `group-hover:` for Tailwind group hover state.

```typescript
function groupHover(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `group-hover:`-prefixed classes.

#### `hide(breakpoint)`

Returns classes that show an element below the given breakpoint and hide it at or above.

```typescript
function hide(breakpoint: keyof ThemeBreakpoints): string
```

- `breakpoint` — The Tailwind breakpoint key (e.g. `'sm'`, `'md'`, `'lg'`).

**Returns:** A class string like `'block lg:hidden'`.

#### `hover(classes)`

Prefixes each class with `hover:` for Tailwind hover state.

```typescript
function hover(classes?: string[]): string
```

- `classes` — Tailwind utility class strings.

**Returns:** A space-separated string of `hover:`-prefixed classes.

#### `responsive(classes)`

Generates responsive class variants.

```typescript
function responsive(classes?: (string | false | null | undefined)[]): string
```

- `classes` — Tailwind class strings, optionally with responsive prefixes (e.g. `'md:text-base'`).

**Returns:** The merged class string (via `cn`).

#### `show(breakpoint)`

Returns classes that hide an element below the given breakpoint and show it at or above.

```typescript
function show(breakpoint: keyof ThemeBreakpoints): string
```

- `breakpoint` — The Tailwind breakpoint key (e.g. `'sm'`, `'md'`, `'lg'`).

**Returns:** A class string like `'hidden md:block'`.

#### `themeToTailwind(theme)`

Generates a Tailwind config extend object from a molecule theme.

```typescript
function themeToTailwind(theme: Theme): Record<string, Record<string, unknown>>
```

- `theme` — A molecule `Theme` object with colors, spacing, typography, shadows, etc.

**Returns:** A Tailwind `theme.extend` object mapping molecule tokens to Tailwind config values.

### Constants

#### `badgeClasses`

Common badge class presets.

```typescript
const badgeClasses: (props?: ({ variant?: "primary" | "secondary" | "default" | "error" | "success" | "warning" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `buttonClasses`

Common button class presets.

```typescript
const buttonClasses: (props?: ({ variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `camelToKebab`

Converts a camelCase string to kebab-case.

```typescript
const camelToKebab: (str: string) => string
```

#### `cardClasses`

Common card class presets.

```typescript
const cardClasses: (props?: ({ variant?: "outline" | "default" | "elevated" | undefined; padding?: "sm" | "md" | "lg" | "none" | undefined; } & { class?: string; }) | undefined) => string
```

#### `cn`

Merges class names, filtering out falsy values. Supports strings,
numbers, conditional objects, and nested arrays.

```typescript
const cn: (...classes: ClassValue[]) => string
```

#### `cva`

Creates a class variance authority (CVA) function for component variants.
Given a base class and variant configuration, returns a function that
resolves the final class string based on selected variants.

```typescript
const cva: <T extends Record<string, Record<string, string>>>(base: string, config?: CVAConfig<T>) => (props?: { [K in keyof T]?: keyof T[K]; } & { class?: string; }) => string
```

#### `inputClasses`

Common input class presets.

```typescript
const inputClasses: (props?: ({ variant?: "default" | "error" | "success" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `themeToCSS`

Maps a molecule theme to CSS custom properties.

```typescript
const themeToCSS: (theme: ThemeLike) => Record<string, string>
```

## Core Interface
Implements `@molecule/app-styling` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-styling` ^1.0.0
- `@molecule/app-theme` ^1.0.0
