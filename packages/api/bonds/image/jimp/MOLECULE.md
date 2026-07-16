# @molecule/api-image-jimp

Jimp image provider for molecule.dev.

Pure-JavaScript image processing with zero native dependencies.
Supports resize, crop, format conversion, thumbnailing, optimization,
rotation, flip, and flop operations.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-jimp'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-image-jimp @molecule/api-image jimp
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

## Core Interface
Implements `@molecule/api-image` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-image'
import { provider } from '@molecule/api-image-jimp'

export function setupImageJimp(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-image` ^1.0.0

### Runtime Dependencies

- `@molecule/api-image`
- `jimp`

- **WebP and AVIF are NOT supported.** The core `ImageFormat` union includes
  them, but any jimp operation targeting `webp`/`avif` throws
  (`Jimp does not support the "webp" format. Supported formats: jpeg, png,
  gif, tiff.`), and WebP input cannot be decoded either. The inherited E2E
  checklist's "WebP round-trips" item does NOT apply to this bond — if the
  app touches WebP/AVIF, bond `@molecule/api-image-sharp` instead.
- Pure-JS tradeoff: zero native dependencies (runs anywhere Node runs) but
  markedly slower and more memory-hungry than sharp on large images — treat
  sharp as the default and jimp as the no-native-binaries fallback.

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
