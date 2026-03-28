# @molecule/app-color-picker

Color picker core interface for molecule.dev.

Provides a standardized API for color selection UI components.
Bond a provider (e.g. `@molecule/app-color-picker-default`) to
supply the concrete implementation.

## Type
`core`

## Installation
```bash
npm install @molecule/app-color-picker
```

## Usage

```typescript
import { requireProvider } from '@molecule/app-color-picker'

const picker = requireProvider().createPicker({
  value: '#3498db',
  format: 'hex',
  showAlpha: true,
  onChange: (color) => console.log('Selected:', color),
})
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
