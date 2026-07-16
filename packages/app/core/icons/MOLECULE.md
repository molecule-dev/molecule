# @molecule/app-icons

Framework-agnostic icon set interfaces for molecule.dev.

Icon set bond packages (e.g. `@molecule/app-icons-molecule`) export an
`IconSet` object which is bonded via {@link setIconSet} at application
startup. Application code retrieves icons via {@link getIcon} /
{@link getIconDataUrl}, both of which call {@link getIconSet} internally.

## Quick Start

```typescript
import { setIconSet, getIconDataUrl } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'

setIconSet(iconSet)   // once, at app startup — before anything renders an icon

// In components, prefer your framework UI's Icon component
// (e.g. <Icon name="check-circle" /> from the app's UI bundle), which reads
// the bonded set. For CSS/background/favicon contexts:
const url = getIconDataUrl('check-circle', '#16a34a')
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-icons @molecule/app-bond @molecule/app-i18n
```

## API

### Interfaces

#### `CustomIconNames`

Augmentable registry of extra icon names beyond {@link ComponentIconName}.

An icon set bond (or an app merging custom glyphs into the bonded set) that
provides names beyond the required contract declares them here so
`getIcon()` / `<Icon name="…" />` accept them type-safely:

```typescript
declare module '@molecule/app-icons' {
  interface CustomIconNames {
    'my-custom-glyph': true
  }
}
```

Keys are icon names; values are always `true` (the interface is a name
registry, never instantiated).

```typescript
interface CustomIconNames {}
```

#### `IconData`

Complete icon definition — framework-agnostic SVG data.

```typescript
interface IconData {
  /** SVG path elements. */
  paths: IconPath[]
  /** viewBox attribute. Default: "0 0 20 20" */
  viewBox?: string
  /** fill attribute. Default: "currentColor" */
  fill?: string
  /** stroke attribute (for outlined icons). */
  stroke?: string
  /** strokeWidth for outlined icons. */
  strokeWidth?: number
  /** strokeLinecap for outlined icons. */
  strokeLinecap?: 'round' | 'butt' | 'square'
  /** strokeLinejoin for outlined icons. */
  strokeLinejoin?: 'round' | 'miter' | 'bevel'
  /** Raw inner SVG content for complex icons that can't be represented as paths alone. */
  svg?: string
}
```

#### `IconPath`

Single SVG path element data.

```typescript
interface IconPath {
  d: string
  fill?: string
  fillRule?: 'evenodd' | 'nonzero'
  clipRule?: 'evenodd' | 'nonzero'
  opacity?: number
}
```

#### `IconSet`

A named set of icons.

```typescript
interface IconSet {
  [name: string]: IconData
}
```

### Types

#### `ComponentIconName`

Icons required by UI components.
All icon set providers MUST include these.

```typescript
type ComponentIconName =
  // Status
  | 'info-circle'
  | 'check-circle'
  | 'exclamation-triangle'
  | 'x-circle'
  // Close/dismiss
  | 'x-mark'
  // Navigation arrows
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  // Chevrons
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'chevrons-up-down'
  // Common actions
  | 'search'
  | 'plus'
  | 'minus'
  | 'check'
  | 'pencil'
  | 'trash'
  | 'copy'
  | 'download'
  | 'upload'
  | 'share'
  | 'link'
  | 'link-external'
  | 'filter'
  | 'sort-asc'
  | 'sort-desc'
  | 'sync'
  // UI controls
  | 'ellipsis-horizontal'
  | 'eye'
  | 'eye-closed'
  | 'gear'
  | 'lock'
  | 'unlock'
  | 'home'
  | 'globe'
  | 'menu'
  | 'maximize'
  | 'minimize'
  // User
  | 'user'
  | 'people'
  | 'sign-in'
  | 'sign-out'
  // Theme
  | 'sun'
  | 'moon'
  // Notifications
  | 'bell'
  // Content
  | 'file'
  | 'folder'
  | 'calendar'
  | 'clock'
  | 'history'
  | 'tag'
  | 'star'
  | 'heart'
  | 'code'
  | 'mail'
  // Misc
  | 'bug'
  | 'lightbulb'
  | 'mention'
  | 'microphone'
  | 'paperclip'
  | 'question'
  | 'bookmark'
  | 'pin'
  | 'reply'
  | 'image'
  | 'table'
  | 'thumbsup'
  | 'thumbsdown'
  // Brand
  | 'logo-mark'
  | 'logo-dot'
  | 'github'
  | 'google'
  | 'gitlab'
  | 'twitter'
```

#### `IconName`

Every icon name known to the type system: the {@link ComponentIconName}
contract every icon set must provide, plus any {@link CustomIconNames}
augmentations. Use this for `getIcon()` arguments and `icon`/`name` props so
a typo fails the type-check instead of throwing at render time.

```typescript
type IconName = ComponentIconName | (keyof CustomIconNames & string)
```

### Functions

#### `getIcon(name)`

Retrieves a single icon by name from the bonded icon set.

```typescript
function getIcon(name: IconName): IconData
```

- `name` — The icon name to look up.

**Returns:** The icon data (paths, viewBox, stroke/fill attributes).

#### `getIconDataUrl(name, color)`

Generates a CSS `url()` data URI containing an inline SVG for an icon.
Useful for `backgroundImage` styling of native elements (e.g. `<select>`
dropdown arrows) where SVG elements cannot be inserted.

```typescript
function getIconDataUrl(name: IconName, color?: string): string
```

- `name` — The icon name to render.
- `color` — The stroke/fill color for the SVG (defaults to `'#6b7280'`).

**Returns:** A CSS `url("data:image/svg+xml,...")` string.

#### `getIconSet()`

Retrieves the bonded icon set, throwing if none is configured.

```typescript
function getIconSet(): IconSet
```

**Returns:** The bonded icon set.

#### `hasIconSet()`

Checks whether an icon set is currently bonded.

```typescript
function hasIconSet(): boolean
```

**Returns:** `true` if an icon set is bonded.

#### `setIconSet(iconSet)`

Registers an icon set as the active singleton. Called at application
startup to wire an icon library.

```typescript
function setIconSet(iconSet: IconSet): void
```

- `iconSet` — The icon set (a record of icon names to icon data).

## Available Providers

| Provider | Package |
|----------|---------|
| Molecule | `@molecule/app-icons-molecule` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`

- **Bond the icon set before first render** — `getIcon()`/`getIconDataUrl()` (and
  any `Icon` component built on them) throw until `setIconSet()` has run; wire it
  in the app's bond setup, not lazily inside a component.
- Icon names are kebab-case (`'arrow-right'`, `'x-mark'`) and type-checked against
  `IconName`. Don't invent names: an unknown name is a runtime error, not a blank.
  App-specific glyphs are added by merging `IconData` into the bonded set and
  augmenting `CustomIconNames` (see that interface) — never by inlining raw SVG
  per call site.
- Icons are decorative by default — pair them with accessible text
  (`t('key', values, { defaultValue })` labels or `aria-label`), never as the only
  carrier of meaning.

## Translations

Translation strings are provided by `@molecule/app-locales-icons`.
