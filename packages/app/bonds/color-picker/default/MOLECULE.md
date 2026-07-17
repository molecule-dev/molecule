# @molecule/app-color-picker-default

Default provider for `@molecule/app-color-picker`.

Provides an in-memory color picker implementation conforming to
the molecule color picker provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-color-picker-default'
import { setProvider } from '@molecule/app-color-picker'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-color-picker-default @molecule/app-color-picker
```

## API

### Interfaces

#### `DefaultColorPickerConfig`

Provider-specific configuration options.

```typescript
interface DefaultColorPickerConfig {
  /** Default color format. Defaults to `'hex'`. */
  format?: 'hex' | 'rgb' | 'hsl'
}
```

### Functions

#### `createProvider(config)`

Creates a default color picker provider.

```typescript
function createProvider(config?: DefaultColorPickerConfig): ColorPickerProvider
```

- `config` — Optional provider configuration. `config.format` supplies the

**Returns:** A configured ColorPickerProvider.

### Constants

#### `provider`

Default color picker provider instance.

```typescript
const provider: ColorPickerProvider
```

## Core Interface
Implements `@molecule/app-color-picker` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-color-picker'
import { provider } from '@molecule/app-color-picker-default'

export function setupColorPickerDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-color-picker` ^1.0.0

### Runtime Dependencies

- `@molecule/app-color-picker`

This default instance is a plain value/format store: `setFormat()` only
records the format — it does NOT convert the current value between
hex/rgb/hsl, and `setValue()` accepts any string without validation or
normalization. If your UI offers format switching, convert the value
yourself before calling `setValue()`. `presets`, `showAlpha`, and
`showInput` are carried in options for YOUR rendering layer — the
instance does not act on them. `createProvider({ format })` sets the
DEFAULT format for every picker created by that provider; a per-picker
`createPicker({ format })` still overrides it, falling back to `'hex'`
when neither is set.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Picking a color through the app's swatches/sliders/input updates the
  instance: getValue() returns the new color and the string the app shows
  matches what was picked, in the configured `format` (hex/rgb/hsl).
- [ ] onChange fires with the new value on every change, and the consumer
  the picker drives (the element whose color the onChange value applies to)
  reflects the new color LIVE in the preview — not just the swatch UI.
- [ ] The displayed value is in the active format: a picker with
  `format: 'rgb'` shows `rgb(...)`, `'hex'` shows `#...`; getValue() and the
  display agree, and after setFormat() getFormat() reports the new format.
- [ ] With `showAlpha: true`, changing opacity is reflected in the emitted
  value (getValue()/onChange include the alpha channel, e.g. rgba/8-digit
  hex); with showAlpha false there is no opacity control and the value stays
  fully opaque.
- [ ] Selecting one of the `presets` swatches sets exactly that color —
  getValue() equals the preset string and onChange fires with it.
- [ ] setValue() called programmatically updates BOTH the control (active
  swatch/sliders/input) and the displayed string, and onChange reflects it.
- [ ] The app's clear/reset control returns the value to the default the
  picker was created with (its initial `value`), reflected in both the
  control and the display.
- [ ] An invalid manual entry in the `showInput` text field is rejected or
  normalized — never emitted as a broken value; getValue()/onChange only
  ever produce a valid color in the configured format.
