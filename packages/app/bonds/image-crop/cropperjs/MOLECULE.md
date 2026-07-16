# @molecule/app-image-crop-cropperjs

Image-crop provider for `@molecule/app-image-crop` — headless, in-memory
crop-region state (rect, rotation, zoom). Despite the name, this bond does
NOT use the Cropper.js library (no dependency), and it does not produce
pixel output: **`getCroppedCanvas()` returns a non-functional placeholder
object, not a real `<canvas>`** — calling `.toBlob()`/`.toDataURL()` on the
result throws.

## Quick Start

```typescript
import { provider } from '@molecule/app-image-crop-cropperjs'
import { setProvider } from '@molecule/app-image-crop'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-image-crop-cropperjs @molecule/app-image-crop
```

## API

### Interfaces

#### `CropperjsConfig`

Provider-specific configuration options.

```typescript
interface CropperjsConfig {
  /** Whether to show guides by default. Defaults to `true`. */
  guides?: boolean

  /** Whether to show the crop box background. Defaults to `true`. */
  background?: boolean
}
```

### Functions

#### `createProvider(_config)`

Creates a Cropper.js-based image crop provider.

```typescript
function createProvider(_config?: CropperjsConfig): ImageCropProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured ImageCropProvider.

### Constants

#### `provider`

Default Cropper.js provider instance.

```typescript
const provider: ImageCropProvider
```

## Core Interface
Implements `@molecule/app-image-crop` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-image-crop'
import { provider } from '@molecule/app-image-crop-cropperjs'

export function setupImageCropCropperjs(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-image-crop` ^1.0.0

### Runtime Dependencies

- `@molecule/app-image-crop`

- **Do NOT build an export/upload flow on `getCroppedCanvas()`** — with this
  bond it returns `{}` cast to `HTMLCanvasElement`. Produce the cropped
  pixels in app code instead: read `getCropData()` and draw the region with
  `canvas.getContext('2d').drawImage(img, x, y, width, height, 0, 0, w, h)`,
  then `canvas.toBlob(...)` — and verify the result renders before shipping.
- **Headless: no crop UI mounts anywhere.** Render the image, crop-box
  overlay, and handles yourself (ClassMap + `t()`), feeding gestures into
  `setCropData()` / `rotate()` / `zoom()`.
- `createProvider()` ignores its configuration — `CropperjsConfig.guides` /
  `background` are currently inert.
- **Wire with `setProvider()` from `@molecule/app-image-crop`** — the core
  keeps a module-local singleton; a generic `bond('image-crop', …)` silently
  no-ops and `requireProvider()` throws.
