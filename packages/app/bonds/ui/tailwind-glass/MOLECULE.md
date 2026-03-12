# @molecule/app-ui-tailwind-glass

Liquid glass ClassMap extension for Tailwind CSS.

Extends the base Tailwind ClassMap with backdrop-filter blur and
saturation effects on surface components (cards, modals, headers,
dropdowns, tooltips, toasts, drawers). Designed to pair with
translucent theme colors for a frosted glass appearance.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ui-tailwind-glass
```

## Usage

```typescript
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind-glass'

// Use instead of @molecule/app-ui-tailwind's classMap
setClassMap(classMap)
```

## API

### Functions

#### `glassOverrides(base)`

Glass effect ClassMap overrides.

Layers backdrop-filter blur and saturation boost onto surface components.
Designed to pair with translucent theme colors (rgba surfaces with alpha).

```typescript
function glassOverrides(base: UIClassMap): { card: (opts: CardClassOptions | undefined) => string; modal: (opts: ModalClassOptions | undefined) => string; toast: (opts: ToastClassOptions | undefined) => string; tooltip: () => string; headerBar: string; drawer: string; dropdownContent: string; tabsList: string; actionSheet: string; dialogOverlay: string; }
```

### Constants

#### `classMap`

Complete glass ClassMap — base Tailwind classMap extended with glass overrides.

Wire at app startup:
```typescript
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind-glass'
setClassMap(classMap)
```

```typescript
const classMap: UIClassMap
```

## Core Interface
Implements `@molecule/app-ui` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-styling` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-tailwind` ^1.0.0

This package extends (not replaces) the base Tailwind ClassMap.
All component classes remain identical — only surface components
gain backdrop-filter effects. Pair with a translucent theme preset
(e.g. @molecule/app-theme-css-variables-liquid-glass) for the full effect.
