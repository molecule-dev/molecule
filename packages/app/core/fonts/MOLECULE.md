# @molecule/app-fonts

Font interfaces and provider system for molecule.dev.

Registers a font per role (`sans`, `serif`, `mono`) and applies it app-wide:
`setFont()` bonds the definition, sets the `--mol-font-{role}` CSS variable,
and injects the loading CSS (`<link>` for CDN sources, `@font-face` for
local files) into the document head. Font bond packages (e.g.
`@molecule/app-fonts-inter`, `@molecule/app-fonts-jetbrains-mono`) export a
ready-made `FontDefinition` named `font`.

## Quick Start

```typescript
import { setFont } from '@molecule/app-fonts'
import { font as sans } from '@molecule/app-fonts-inter'
import { font as mono } from '@molecule/app-fonts-jetbrains-mono'

setFont(sans)   // once, at app startup — before first paint
setFont(mono)
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-fonts @molecule/app-bond
```

## API

### Interfaces

#### `FontConfig`

Resolved font configuration for all three roles.

```typescript
interface FontConfig {
  sans: FontDefinition
  serif: FontDefinition
  mono: FontDefinition
}
```

#### `FontDefinition`

Complete definition for a single font family.

```typescript
interface FontDefinition {
  /** CSS font-family name (e.g., 'Arimo', 'Inter'). */
  family: string
  /** Which role this font fills (sans, serif, or mono). */
  role: FontRole
  /** Fallback fonts appended after the family in the CSS value. */
  fallbacks: string[]
  /** How to load this font. */
  source: FontSource
  /**
   * Extra CSS injected verbatim after this font's `@font-face` block — the
   * utility class an icon font needs (e.g. `.material-symbols-outlined { … }`).
   * Only meaningful for `icon`-role fonts; ignored for text roles.
   */
  utilityCss?: string
}
```

#### `FontFaceDescriptor`

Descriptor for a single `@font-face` declaration (local fonts).

```typescript
interface FontFaceDescriptor {
  /** Font filename relative to the package's fontsDir (e.g., 'Arimo-Regular.ttf'). */
  file: string
  /** CSS font-weight value — number (400) or range string ('100 1000'). */
  weight: number | string
  /** CSS font-style: 'normal' or 'italic'. Defaults to 'normal'. */
  style?: string
  /** If true, this is a variable font — wrap in `@supports` (font-variation-settings: normal). */
  variable?: boolean
}
```

#### `FontSource`

Font loading source information.

```typescript
interface FontSource {
  /** The source type for loading. */
  type: FontSourceType
  /** Full URL for the font CSS stylesheet (for google/bunny/custom). */
  url?: string
  /** Preconnect origins (e.g., ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']). */
  preconnect?: string[]
  /** `@font-face` descriptors for local font files. */
  faces?: FontFaceDescriptor[]
}
```

### Types

#### `FontRole`

Which font role this font fills.

`sans`/`serif`/`mono` are text roles applied app-wide via `--mol-font-{role}`.
`icon` is for icon fonts (e.g. Material Symbols) — consumed through a utility
class (`.material-symbols-outlined`), not a text `font-family`, so an `icon`
font carries `utilityCss` that `setFont()` injects alongside its `@font-face`.

```typescript
type FontRole = 'sans' | 'serif' | 'mono' | 'icon'
```

#### `FontSourceType`

How a font is loaded.

```typescript
type FontSourceType = 'google' | 'bunny' | 'local' | 'system' | 'custom'
```

### Functions

#### `buildFontFamily(font)`

Build a CSS font-family value from a FontDefinition.

```typescript
function buildFontFamily(font: FontDefinition): string
```

- `font` — The font definition containing a primary family and fallback list.

**Returns:** A CSS-ready `font-family` string (e.g. `"'Arimo', system-ui, sans-serif"`).

#### `getFont(role)`

Retrieves the font definition bonded for a specific role.

```typescript
function getFont(role: FontRole): FontDefinition | undefined
```

- `role` — The font role (`'sans'`, `'serif'`, or `'mono'`).

**Returns:** The bonded font definition, or `undefined` if none is set.

#### `getFontConfig()`

Returns the complete font configuration for all three roles.
Falls back to system font stacks for any role not explicitly set.

```typescript
function getFontConfig(): FontConfig
```

**Returns:** The resolved font config with `sans`, `serif`, and `mono` definitions.

#### `hasFont(role)`

Checks whether a font has been bonded for a specific role.

```typescript
function hasFont(role: FontRole): boolean
```

- `role` — The font role to check.

**Returns:** `true` if a font is bonded for the given role.

#### `hasFontConfig()`

Checks whether any font role has been explicitly configured.

```typescript
function hasFontConfig(): boolean
```

**Returns:** `true` if at least one font role is bonded.

#### `resetFonts()`

Removes all bonded font definitions. Primarily used in tests.

```typescript
function resetFonts(): void
```

#### `setFont(font)`

Registers a font definition for a specific role (`sans`, `serif`, or `mono`).

Bonds the font via the named provider system, sets the
`--mol-font-{role}` CSS variable, and injects font loading
into the document head (CDN `<link>` tags or `@font-face` declarations).

```typescript
function setFont(font: FontDefinition): void
```

- `font` — The font definition including family, role, and source configuration.

### Constants

#### `systemMono`

System monospace font stack (used when no provider is configured).

```typescript
const systemMono: FontDefinition
```

#### `systemSans`

System sans-serif font stack (used when no provider is configured).

```typescript
const systemSans: FontDefinition
```

#### `systemSerif`

System serif font stack (used when no provider is configured).

```typescript
const systemSerif: FontDefinition
```

## Available Providers

| Provider | Package |
|----------|---------|
| Arimo | `@molecule/app-fonts-arimo` |
| DM Sans | `@molecule/app-fonts-dm-sans` |
| DM Serif Display | `@molecule/app-fonts-dm-serif-display` |
| IBM Plex Mono | `@molecule/app-fonts-ibm-plex-mono` |
| IBM Plex Sans | `@molecule/app-fonts-ibm-plex-sans` |
| Inter | `@molecule/app-fonts-inter` |
| JetBrains Mono | `@molecule/app-fonts-jetbrains-mono` |
| Lato | `@molecule/app-fonts-lato` |
| Lora | `@molecule/app-fonts-lora` |
| Manrope | `@molecule/app-fonts-manrope` |
| Material Symbols Outlined | `@molecule/app-fonts-material-symbols` |
| Merriweather | `@molecule/app-fonts-merriweather` |
| Newsreader | `@molecule/app-fonts-newsreader` |
| Playfair Display | `@molecule/app-fonts-playfair-display` |
| Plus Jakarta Sans | `@molecule/app-fonts-plus-jakarta-sans` |
| Source Serif 4 | `@molecule/app-fonts-source-serif-4` |
| Space Grotesk | `@molecule/app-fonts-space-grotesk` |
| System | `@molecule/app-fonts-system` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **ALL fonts are local — NEVER load one from a CDN.** Every provider bond here
  (`@molecule/app-fonts-inter`, `-jetbrains-mono`, `-material-symbols`, and the
  display/serif faces) is `source: 'local'` and self-hosts from `/fonts/`. Do
  NOT add a Google Fonts `<link href="https://fonts.googleapis.com…">`, an
  `@import url(https://fonts.gstatic…)`, or a `next/font/google` import: external
  fonts fail in the sandbox (egress is blocked), leak the visitor's IP, and add
  render-blocking round-trips (cross-site CDN caching died with browser cache
  partitioning ~2020). If an imported app loads fonts from a CDN, localize them —
  swap to one of these packages, or bundle the file + a local `@font-face`.
- **Consume fonts through the CSS variable (`var(--mol-font-sans)` etc.), never a
  hardcoded `font-family`** — the variable is the swap point; hardcoding defeats
  the bond. The app's theme/ClassMap layer normally references it already.
- **Local-source fonts load from `/fonts/<file>`.** Each `faces[].file` must be
  served at that public path or every face silently 404s and the fallback stack
  renders instead. CDN sources inject `<link>` tags (with preconnect origins).
- Call `setFont()` at startup, before first paint, to avoid a font flash; calling
  again for the same role replaces the font (idempotent per role).
- `getFontConfig()` always returns a complete config — roles never explicitly set
  fall back to system stacks (`systemSans`/`systemSerif`/`systemMono`).
- **Icon fonts (role `icon`, e.g. `@molecule/app-fonts-material-symbols`) are
  local like any other font** — never load them from a CDN. They carry a
  `utilityCss` string (the `.material-symbols-outlined` class) that `setFont()`
  injects with the `@font-face`, so the icon glyphs work fully offline. NEVER
  add a `<link href="https://fonts.googleapis.com/...Material+Symbols...">` —
  it fails in the sandbox (blocked egress) and leaks the visitor's IP.
- DOM injection is skipped outside the browser, so `setFont()` is SSR-safe.
