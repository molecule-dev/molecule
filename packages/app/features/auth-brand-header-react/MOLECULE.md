# @molecule/app-auth-brand-header-react

`@molecule/app-auth-brand-header-react` — auth-page brand header:
gradient icon chip + wordmark + tagline, centered.

Two modes: preset (pass `appName` / `tagline` / `icon` and the default
chip + wordmark + tagline render) or composed (pass `children` built
from the exported `<AuthBrandHeaderChip>`, `<AuthBrandHeaderWordmark>`,
and `<AuthBrandHeaderTagline>` sub-components — preset props are then
ignored).

## Quick Start

```tsx
import { AuthBrandHeader } from '@molecule/app-auth-brand-header-react'
import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function MyAuthHeader() {
  return (
    <AuthBrandHeader
      appName={APP_NAME}
      tagline={APP_TAGLINE}
      icon="gavel"
      chipGradient="linear-gradient(135deg, #e05a2b, #f06a3b)"
      wordmarkColor="#e05a2b"
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-brand-header-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `AuthBrandHeaderChipProps`

The gradient material-symbols chip shown above the wordmark.

```typescript
interface AuthBrandHeaderChipProps {
  /** Material-symbol icon name shown inside the chip. */
  icon: string
  /**
   * CSS background value for the chip — typically a `linear-gradient(...)`.
   * Falls back to the wired ClassMap's `bg-primary` token when omitted, so
   * the chip's white icon glyph always has a colored backdrop.
   */
  chipGradient?: string
  /** Chip corner shape. `'round'` = `rounded-full`, `'square'` = `rounded-2xl`. */
  chipShape?: 'round' | 'square'
}
```

#### `AuthBrandHeaderProps`

Props for {@link AuthBrandHeader}.

Pass `children` to compose the header from `<AuthBrandHeaderChip>` /
`<AuthBrandHeaderWordmark>` / `<AuthBrandHeaderTagline>` (or bespoke
nodes). Omit `children` to use preset mode — the `appName` /
`tagline` / `icon` props render the default chip + wordmark + tagline.

```typescript
interface AuthBrandHeaderProps {
  /**
   * Composed header content. When set, the preset props below are
   * ignored and `children` renders inside the centered `<header>`.
   */
  children?: ReactNode
  /** Extra classes appended to the `<header>` wrapper. */
  className?: string
  // --- preset mode (used only when `children` is omitted) ---
  /** Brand name for the default wordmark. */
  appName?: string
  /** Tagline for the default tagline line. */
  tagline?: string
  /** Material-symbol icon name for the default chip (omit for no chip). */
  icon?: string
  /** CSS background for the default chip. */
  chipGradient?: string
  /** Default chip corner shape. */
  chipShape?: 'round' | 'square'
  /** Inline color for the default wordmark `<h1>`. */
  wordmarkColor?: string
}
```

#### `AuthBrandHeaderTaglineProps`

The tagline `<p>`. Pass the tagline text as children; `className`
appends to the default small muted treatment.

```typescript
interface AuthBrandHeaderTaglineProps {
  children: ReactNode
  /** Extra classes appended to the default tagline `<p>` chrome. */
  className?: string
}
```

#### `AuthBrandHeaderWordmarkProps`

The wordmark `<h1>`. Pass the brand name (or bespoke accented nodes)
as children; `className` appends to the default `4xl` extra-bold
treatment, `color` sets an inline color.

```typescript
interface AuthBrandHeaderWordmarkProps {
  children: ReactNode
  /** Inline color for the `<h1>`. */
  color?: string
  /** Extra classes appended to the default wordmark `<h1>` chrome. */
  className?: string
}
```

### Functions

#### `AuthBrandHeader({
  children,
  className,
  appName,
  tagline,
  icon,
  chipGradient,
  chipShape,
  wordmarkColor,
})`

Centered auth-page brand header supporting both composable children and preset mode.

```typescript
function AuthBrandHeader({
  children,
  className,
  appName,
  tagline,
  icon,
  chipGradient,
  chipShape,
  wordmarkColor,
}: AuthBrandHeaderProps): JSX.Element
```

#### `AuthBrandHeaderChip({
  icon,
  chipGradient,
  chipShape = 'round',
})`

Renders the gradient material-symbols chip shown above the wordmark.

```typescript
function AuthBrandHeaderChip({
  icon,
  chipGradient,
  chipShape = 'round',
}: AuthBrandHeaderChipProps): JSX.Element
```

#### `AuthBrandHeaderTagline({
  children,
  className,
})`

Renders the tagline `<p>` with a muted style and optional extra classes.

```typescript
function AuthBrandHeaderTagline({
  children,
  className,
}: AuthBrandHeaderTaglineProps): JSX.Element
```

#### `AuthBrandHeaderWordmark({
  children,
  color,
  className,
})`

Renders the wordmark `<h1>` with optional inline color and extra classes.

```typescript
function AuthBrandHeaderWordmark({
  children,
  color,
  className,
}: AuthBrandHeaderWordmarkProps): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

`icon` is a Material Symbols name rendered with the
`material-symbols-outlined` icon font — the app must load that font
(molecule scaffolds do; a custom stack must add it) or the icon name
renders as literal text. Omit `icon` to skip the chip entirely. The
default chip/wordmark treatment uses Tailwind theme tokens
(`bg-primary`, `text-on-surface`) from the wired ClassMap bond — with
a non-Tailwind ClassMap, pass `chipGradient` / `wordmarkColor` /
`className` explicitly.
