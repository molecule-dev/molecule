# @molecule/api-image-sharp

Sharp image provider for molecule.dev.

High-performance, native image processing powered by libvips via Sharp.
Supports resize, crop, format conversion, thumbnailing, optimization,
rotation, flip, and flop operations.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-image-sharp
```

## Usage

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-sharp'

setProvider(provider)
```

## API

### Interfaces

#### `SharpConfig`

Configuration options for the Sharp image provider.

```typescript
interface SharpConfig {
  /** Default JPEG quality (1–100). Defaults to `80`. */
  defaultJpegQuality?: number

  /** Default PNG compression level (0–9). Defaults to `6`. */
  defaultPngCompression?: number

  /** Default WebP quality (1–100). Defaults to `80`. */
  defaultWebpQuality?: number

  /** Default AVIF quality (1–100). Defaults to `50`. */
  defaultAvifQuality?: number

  /** Whether to use progressive encoding for JPEG by default. Defaults to `false`. */
  progressive?: boolean

  /** Whether to strip metadata by default. Defaults to `true`. */
  stripMetadata?: boolean

  /** Limit the number of pixels to process (width × height). Defaults to `268402689` (Sharp default). */
  limitInputPixels?: number | false
}
```

### Functions

#### `createProvider(config)`

Creates a Sharp-backed image provider.

```typescript
function createProvider(config?: SharpConfig): ImageProvider
```

- `config` — Optional provider configuration (default quality, strip metadata, etc.).

**Returns:** An `ImageProvider` backed by Sharp.

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
