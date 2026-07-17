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

#### `getSupportedFormats()`

Returns the image formats this bond can produce. Never advertises `webp`/`avif`.

```typescript
function getSupportedFormats(): readonly ImageFormat[]
```

**Returns:** The list of supported `ImageFormat`s for capability feature-detection.

### Constants

#### `provider`

The provider implementation, lazily initialized with default config.

```typescript
const provider: ImageProvider
```

#### `SUPPORTED_FORMATS`

The `ImageFormat`s this bond can actually decode AND encode. Deliberately
EXCLUDES `webp` and `avif`: Jimp 1.x ships no codec for either, so this bond
must not advertise formats it cannot produce — use `@molecule/api-image-sharp`
when those are required. Callers can read this to feature-detect before
requesting a conversion.

```typescript
const SUPPORTED_FORMATS: readonly ImageFormat[]
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

- **WebP and AVIF are NOT supported** — Jimp 1.x ships no codec for either.
  The core `ImageFormat` union includes them, but this bond does not advertise
  them: `getSupportedFormats()` returns only `jpeg, png, gif, tiff`. Requesting
  `webp`/`avif` as OUTPUT (`convert`/`optimize`) or as INPUT (any decode) fails
  early with a clear, actionable error that names the sharp sibling (for example:
  `jimp does not support the "webp" output format — use @molecule/api-image-sharp for WebP/AVIF. jimp supports: jpeg, png, gif, tiff.`),
  never an opaque mid-pipeline throw. The inherited E2E checklist's "WebP
  round-trips" item does NOT apply to this bond: feature-detect with
  `getSupportedFormats()` and bond `@molecule/api-image-sharp` when the app
  touches WebP/AVIF.
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
