# @molecule/api-image-sharp

Sharp image provider for molecule.dev.

High-performance, native image processing powered by libvips via Sharp.
Supports resize, crop, format conversion, thumbnailing, optimization,
rotation, flip, and flop operations.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-sharp'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-image-sharp @molecule/api-image sharp
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

## Core Interface
Implements `@molecule/api-image` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-sharp'

export function setupImageSharp(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-image` ^1.0.0

### Runtime Dependencies

- `@molecule/api-image`
- `sharp`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Uploading an image through the UI produces the PROCESSED variant where the
  app uses one (thumbnail/resized/avatar) and it actually renders — check
  its rendered dimensions or transfer size against the original to confirm
  processing happened.
- [ ] Common input formats (JPEG, PNG, WebP) all round-trip to a rendered
  result.
- [ ] A corrupt or non-image file fails with a visible, readable error — not a
  server crash or a broken-image placeholder that persists.
- [ ] Any UI that shows image metadata (dimensions, size) matches the real
  file.
- [ ] Where optimization is wired, the served image is materially smaller than
  the uploaded original.
