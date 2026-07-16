# @molecule/app-styling-tailwind

Tailwind CSS styling utilities for molecule.dev.

The Tailwind bond for `@molecule/app-styling`: registers `tailwind-merge` as the
class-conflict merger for `cn()`, converts molecule themes into Tailwind config
(`themeToTailwind`), and ships cva-based component presets (`buttonClasses`,
`inputClasses`, `cardClasses`, `badgeClasses`) plus responsive/state helpers
(`responsive`, `show`, `hide`, `dark`, `hover`, …).

## Quick Start

```typescript
// 1. App startup — register the merger so cn() resolves Tailwind conflicts:
import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'
registerTailwindClassMerger()

// 2. tailwind.config.ts — derive the theme scale from the molecule theme:
import { themeToTailwind } from '@molecule/app-styling-tailwind'
import { lightTheme } from '@molecule/app-theme'
const tailwindConfig = { theme: { extend: themeToTailwind(lightTheme) } }
// …then `export default tailwindConfig` from tailwind.config.ts
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-styling-tailwind @molecule/app-styling @molecule/app-theme tailwind-merge
```

## API

### Interfaces

#### `CVAConfig`

Configuration for a class-variance-authority (`cva`) function: the variant
definitions, default selections, and compound variants used to resolve a
component's final class string from its props.

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

#### `registerTailwindClassMerger()`

Registers `tailwind-merge` as the class merger for `@molecule/app-styling`'s
`cn()`, so conflicting Tailwind utilities (e.g. two `gap-*`) resolve with the
last one winning. Called once at startup by `setupAppStylingTailwind()` in
the default React bond wiring; call it directly in any custom setup (or test)
that renders Tailwind-styled components and relies on conflict resolution.

```typescript
function registerTailwindClassMerger(): void
```

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

When a class merger is registered via {@link setClassMerger} (e.g. the
Tailwind bond registers `tailwind-merge`), conflicting utilities such as two
`gap-*` classes are resolved by it; otherwise the joined string is returned
as-is.

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

### Runtime Dependencies

- `@molecule/app-styling`
- `@molecule/app-theme`
- `tailwind-merge`

- **This is NOT the ClassMap bond.** Application components style via
  `getClassMap()` / `cm.*` from `@molecule/app-ui` (Tailwind ClassMap bond:
  `@molecule/app-ui-tailwind`). This package is infrastructure for styling/ClassMap
  bonds and shared-component plumbing — raw Tailwind class strings stay inside
  bond packages.
- **Call `registerTailwindClassMerger()` once at startup.** Without it,
  `cn()`/`cva()` from `@molecule/app-styling` just join strings — conflicting
  utilities (e.g. two `gap-*` classes) BOTH survive and "last class wins" silently
  doesn't apply.
- The cva presets emit semantic token classes (`bg-primary`, `bg-surface`, …) —
  they only resolve if the Tailwind config defines those colors; wire
  `themeToTailwind(theme)` into `theme.extend` as shown.
