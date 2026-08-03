# @molecule/app-country-flags

Framework-agnostic country/region flag interfaces for molecule.dev.

Flag bond packages (e.g. `@molecule/app-country-flags-country-flag-icons`)
export a `CountryFlagSet` object which is bonded via {@link setCountryFlags}
at application startup. Application code retrieves flags via
{@link getCountryFlag}.

## Quick Start

```typescript
import { getCountryFlag, setCountryFlags } from '@molecule/app-country-flags'
import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'

setCountryFlags(countryFlags) // once, at app startup

const flag = getCountryFlag('us')
if (flag) {
  // flag.svg is complete rectangular SVG markup (viewBox-only sizing);
  // flag.aspectRatio (width / height) sizes the rendered element.
}
```

## Type

`core`

## Installation

```bash
npm install @molecule/app-country-flags @molecule/app-bond
```

## API

### Interfaces

#### `CountryFlagData`

A single country/region flag as framework-agnostic SVG markup.

```typescript
interface CountryFlagData {
  /**
   * Complete rectangular SVG markup with viewBox-only sizing — consumers set
   * the rendered width/height (e.g. by injecting attributes or via a sized
   * wrapper element).
   */
  svg: string
  /** Width divided by height, e.g. `1.5` for a 3:2 rectangle. */
  aspectRatio: number
}
```

### Types

#### `CountryFlagSet`

Flags keyed by UPPERCASE ISO 3166-1 alpha-2 code (`'US'`, `'CN'`), including
the pseudo-codes flag libraries commonly ship (e.g. `'EU'`).

```typescript
type CountryFlagSet = Record<string, CountryFlagData>
```

### Functions

#### `getCountryFlag(code)`

Retrieves a single flag by country/region code from the bonded flag set.

Deliberately non-throwing (unlike `@molecule/app-icons`' `getIcon()`): flags
are decorative, so a missing flag — unbonded set or unknown code — returns
`undefined` and the consumer renders its textual fallback (e.g. the code).

```typescript
function getCountryFlag(code: string): CountryFlagData | undefined
```

- `code` — ISO 3166-1 alpha-2 code (case-insensitive), e.g. `'us'`.

**Returns:** The flag data, or `undefined` when no set is bonded or the code is not in the bonded set.

#### `hasCountryFlags()`

Checks whether a flag set is currently bonded.

```typescript
function hasCountryFlags(): boolean
```

**Returns:** `true` if a flag set is bonded.

#### `setCountryFlags(flagSet)`

Registers a flag set as the active singleton. Called at application startup
to wire a flag library.

```typescript
function setCountryFlags(flagSet: CountryFlagSet): void
```

- `flagSet` — The flag set (a record of UPPERCASE codes to flag data).

## Available Providers

| Provider           | Package                                          |
| ------------------ | ------------------------------------------------ |
| country-flag-icons | `@molecule/app-country-flags-country-flag-icons` |

## Injection Notes

### Requirements

Peer dependencies:

- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **`getCountryFlag()` never throws** — flags are decorative, so an unbonded
  set or unknown code returns `undefined`. Always render a textual fallback
  (typically the code itself) for the `undefined` case instead of assuming a
  flag exists.
- Codes are ISO 3166-1 alpha-2 and case-insensitive on lookup; sets are
  keyed UPPERCASE. Pseudo-codes flag libraries ship (e.g. `'EU'`) are valid
  set keys too.
- The SVG markup intentionally has no width/height attributes — inject them
  (or size a wrapper) at render time using `aspectRatio`.
