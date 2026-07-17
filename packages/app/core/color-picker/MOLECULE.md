# @molecule/app-color-picker

Color picker core interface for molecule.dev.

Framework-agnostic contract for color selection **state** (current value,
format, alpha, presets). Bond a provider (e.g.
`@molecule/app-color-picker-default`) to supply the logic; your UI renders
the picker and feeds interactions into the instance.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-color-picker'
import { provider } from '@molecule/app-color-picker-default'

setProvider(provider)                    // once, at app startup (bonds.ts)

const picker = requireProvider().createPicker({
  value: '#3498db',
  format: 'hex',
  showAlpha: true,
  onChange: (color) => applyBrandColor(color),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-color-picker
```

## API

### Interfaces

#### `ColorPickerInstance`

A live color picker instance returned by the provider.

```typescript
interface ColorPickerInstance {
  /**
   * Returns the current color value as a formatted string.
   *
   * @returns The current color in the configured format.
   */
  getValue(): string

  /**
   * Sets the color value programmatically.
   *
   * @param color - Color value string (hex, rgb, or hsl).
   */
  setValue(color: string): void

  /**
   * Returns the current output format.
   *
   * @returns The active color format.
   */
  getFormat(): string

  /**
   * Changes the output format.
   *
   * @param format - The color format to use.
   */
  setFormat(format: 'hex' | 'rgb' | 'hsl'): void

  /**
   * Destroys the picker instance and cleans up resources.
   */
  destroy(): void
}
```

#### `ColorPickerOptions`

Configuration options for creating a color picker.

```typescript
interface ColorPickerOptions {
  /** Initial color value (e.g. `'#ff0000'`, `'rgb(255,0,0)'`, `'hsl(0,100%,50%)'`). */
  value?: string

  /** Color output format. Defaults to `'hex'`. */
  format?: 'hex' | 'rgb' | 'hsl'

  /** Preset color swatches for quick selection. */
  presets?: string[]

  /** Whether to show an alpha/opacity channel control. Defaults to `false`. */
  showAlpha?: boolean

  /** Whether to show a text input for manual color entry. Defaults to `true`. */
  showInput?: boolean

  /** Callback when the selected color changes. */
  onChange?: (color: string) => void
}
```

#### `ColorPickerProvider`

Color picker provider interface.

All color picker providers must implement this interface to create
and manage color selection UI.

```typescript
interface ColorPickerProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new color picker instance.
   *
   * @param options - Configuration for the picker.
   * @returns A color picker instance.
   */
  createPicker(options: ColorPickerOptions): ColorPickerInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded color picker provider, or `null` if none is bonded.

```typescript
function getProvider(): ColorPickerProvider | null
```

**Returns:** The active color picker provider, or `null`.

#### `hasProvider()`

Checks whether a color picker provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a color picker provider is available.

#### `requireProvider()`

Retrieves the bonded color picker provider, throwing if none is configured.

```typescript
function requireProvider(): ColorPickerProvider
```

**Returns:** The active color picker provider.

#### `setProvider(provider)`

Registers a color picker provider as the active singleton.

```typescript
function setProvider(provider: ColorPickerProvider): void
```

- `provider` — The color picker provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Color Picker | `@molecule/app-color-picker-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

- **The instance is headless — it renders nothing.** Pair it with your
  framework's picker component (React: `@molecule/app-color-picker-react`) or
  render your own swatches/inputs (styled via `getClassMap()`/`cm.*`, labels via
  `t('key', values, { defaultValue })`) and call the instance methods; `onChange`
  fires when the value changes.
- **Wire with THIS package's `setProvider()` or `bond('color-picker', …)`.**
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
  write the same slot; `requireProvider()` throws until one has run.
- Treat the emitted color as an app data value — do not hardcode it into CSS or
  theme files; persist it and apply through your theme/branding layer.

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
