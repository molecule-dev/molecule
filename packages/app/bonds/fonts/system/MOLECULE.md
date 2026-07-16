# @molecule/app-fonts-system

System font bond for molecule.dev — the native OS font stack (`system-ui`
with platform fallbacks). Zero font files, zero network requests, instant
first paint. Exports a ready-made `FontDefinition` (`font`, role `sans`).

## Quick Start

```typescript
import { setFont } from '@molecule/app-fonts'
import { font } from '@molecule/app-fonts-system'

setFont(font)   // once, at app startup
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-fonts-system @molecule/app-fonts
```

## API

### Constants

#### `font`

System font definition — native OS fonts, zero network requests.

```typescript
const font: FontDefinition
```

## Core Interface
Implements `@molecule/app-fonts` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-fonts` ^1.0.0

### Runtime Dependencies

- `@molecule/app-fonts`

- Nothing to serve or copy — there are no font files; `setFont()` only sets
  `--mol-font-sans` to the system stack.
- **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
  `bond('font', …)`** — the CSS variable is only set by `setFont()`.
- Fills the `sans` role only; `serif`/`mono` keep their own system defaults.
