# @molecule/app-fonts

Font interfaces and provider system for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-fonts
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

```typescript
type FontRole = 'sans' | 'serif' | 'mono'
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
| Inter | `@molecule/app-fonts-inter` |
| JetBrains Mono | `@molecule/app-fonts-jetbrains-mono` |
| System | `@molecule/app-fonts-system` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
