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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt each
item to this app's actual crop screen (avatar/photo upload, etc.), and check
every box off one by one. A box you can't check is an integration bug to fix —
not a skip. The cropper is headless, so verify the UI YOU rendered:
- [ ] Opening the crop screen loads the source image (`createCropper({ src })`)
  and renders it with a visible crop-box overlay + drag handles drawn from
  `getCropData()` — not a blank or full-bleed image with no selection.
- [ ] Dragging/resizing the crop box feeds the gesture into `setCropData()`,
  `getCropData()` reflects the new x/y/width/height, and the on-page preview
  (the `getCroppedCanvas()` output drawn into the page) updates to show ONLY
  the selected area, not the whole image.
- [ ] With an aspect-ratio lock (e.g. `aspectRatio: 1` for an avatar) the crop
  box stays that ratio while you resize — `getCropData()` width == height for
  1:1 — and `circular: true` clips the preview to a circle.
- [ ] `rotate()` / `zoom()` transform the source and the crop overlay follows:
  `getCropData().rotate` / `scaleX` change and the preview re-renders the
  transformed region — the selection isn't stranded on the old orientation.
- [ ] Applying the crop OUTPUTS the cropped image: `getCroppedCanvas()` pixels
  match the selected region (not the full source), and downstream the SAVED
  file is the cropped Blob (`canvas.toBlob` → upload) — re-fetch and render the
  stored image and confirm it shows the crop, never the original.
- [ ] Min/max crop size is enforced — you cannot drag the box smaller than
  `minWidth`/`minHeight` or larger than `maxWidth`/`maxHeight`.
- [ ] Cancel/close discards without mutating the source: the original image is
  unchanged and no cropped result is saved.
