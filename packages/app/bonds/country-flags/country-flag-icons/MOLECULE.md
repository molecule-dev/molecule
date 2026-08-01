# @molecule/app-country-flags-country-flag-icons

`country-flag-icons` flag set bond for molecule.dev.

Provides rectangular 3:2 SVG flags from the `country-flag-icons` library
(MIT) as a `CountryFlagSet` for `@molecule/app-country-flags`. A curated
subset (US, CN, EU today) rather than all ~250 flags, because every entry is
inlined SVG that ships in the consuming bundle — extend `src/flags.ts` with
one import + one entry per additional code.

## Quick Start

```typescript
import { setCountryFlags } from '@molecule/app-country-flags'
import { countryFlags } from '@molecule/app-country-flags-country-flag-icons'

setCountryFlags(countryFlags) // once, at app startup
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-country-flags-country-flag-icons @molecule/app-country-flags country-flag-icons
```

## API

### Constants

#### `countryFlags`

Rectangular 3:2 flags from `country-flag-icons`, keyed by UPPERCASE ISO
3166-1 alpha-2 code (plus the `EU` pseudo-code).

Deliberately a curated subset, not the library's full ~250 flags: each entry
is inlined SVG markup that ships in every consuming bundle, and large
emblem-heavy flags run to hundreds of KB. Add codes here (one import + one
entry) as products need them.

```typescript
const countryFlags: CountryFlagSet
```

## Core Interface
Implements `@molecule/app-country-flags` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-country-flags` ^1.0.0

### Runtime Dependencies

- `@molecule/app-country-flags`
- `country-flag-icons`

- The SVG markup has viewBox-only sizing (no width/height attributes) — size
  it at render time via `CountryFlagData.aspectRatio` (always `1.5` here).
- Swapping flag artwork (a different library, custom flags, 1:1 icons) means
  swapping this bond; consumers of `getCountryFlag()` are unaffected.
