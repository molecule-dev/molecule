# @molecule/app-color-picker-default

Default provider for @molecule/app-color-picker.

Provides an in-memory color picker implementation conforming to
the molecule color picker provider interface.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-color-picker-default
```

## Usage

```typescript
import { provider } from '@molecule/app-color-picker-default'
import { setProvider } from '@molecule/app-color-picker'

setProvider(provider)
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

#### `createProvider(_config)`

Creates a default color picker provider.

```typescript
function createProvider(_config?: DefaultColorPickerConfig): ColorPickerProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured ColorPickerProvider.

### Constants

#### `provider`

Default color picker provider instance.

```typescript
const provider: ColorPickerProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-color-picker` ^1.0.0
