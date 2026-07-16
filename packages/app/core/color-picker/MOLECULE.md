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

- **The instance is headless — it renders nothing.** Pair it with your
  framework's picker component (React: `@molecule/app-color-picker-react`) or
  render your own swatches/inputs (styled via `getClassMap()`/`cm.*`, labels via
  `t('key', values, { defaultValue })`) and call the instance methods; `onChange`
  fires when the value changes.
- **Wire with `setProvider()` from THIS package, not `bond('color-picker', …)`.**
  The singleton is module-local; a generic app-bond registration is not seen and
  `requireProvider()` will still throw.
- Treat the emitted color as an app data value — do not hardcode it into CSS or
  theme files; persist it and apply through your theme/branding layer.
