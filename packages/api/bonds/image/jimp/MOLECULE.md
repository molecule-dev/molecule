# @molecule/api-image-jimp

Jimp image provider for molecule.dev.

Pure-JavaScript image processing with zero native dependencies.
Supports resize, crop, format conversion, thumbnailing, optimization,
rotation, flip, and flop operations.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-image-jimp
```

## Usage

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-jimp'

setProvider(provider)
```

## API

### Interfaces

#### `JimpConfig`

Configuration options for the Jimp image provider.

```typescript
interface JimpConfig {
  /** Default JPEG quality (1–100). Defaults to `80`. */
  defaultJpegQuality?: number

  /** Default PNG deflate level (0–9). Defaults to `6`. */
  defaultPngDeflateLevel?: number
}
```

### Functions

#### `createProvider(config)`

Creates a Jimp-backed image provider.

```typescript
function createProvider(config?: JimpConfig): ImageProvider
```

- `config` — Optional provider configuration (default quality settings).

**Returns:** An `ImageProvider` backed by Jimp.

### Constants

#### `provider`

The provider implementation, lazily initialized with default config.

```typescript
const provider: ImageProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-image` ^1.0.0
