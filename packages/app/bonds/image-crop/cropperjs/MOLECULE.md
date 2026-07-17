# @molecule/app-image-crop-cropperjs

Cropper.js image-crop provider for `@molecule/app-image-crop` — a REAL
implementation backed by cropperjs v1. `createCropper({ src })` mounts a live
`Cropper` on an image element and every instance method delegates to the
corresponding cropperjs call, so `getCroppedCanvas()` returns the actual
cropped `<canvas>` (call `.toBlob()` / `.toDataURL()` on it to export) — not a
placeholder object.

## Quick Start

```typescript
import { provider } from '@molecule/app-image-crop-cropperjs'
import { setProvider, requireProvider } from '@molecule/app-image-crop'

setProvider(provider)   // once, at app startup (bonds.ts)

const cropper = requireProvider().createCropper({ src: '/avatar.jpg', aspectRatio: 1 })
const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
canvas.toBlob((blob) => uploadAvatar(blob), 'image/png')
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

Provider-level defaults applied to every cropper created by the provider.

These map onto cropperjs constructor options. Per-cropper `CropperOptions`
(e.g. `guides`) take precedence over the matching field here.

```typescript
interface CropperjsConfig {
  /**
   * Whether to show the dashed crop guide lines by default. Overridden per-cropper
   * by `CropperOptions.guides`. Defaults to `true`.
   */
  guides?: boolean

  /** Whether to render the checkerboard background behind the image. Defaults to `true`. */
  background?: boolean

  /**
   * cropperjs view mode (0-3) constraining the crop box relative to the canvas /
   * container. `1` restricts the crop box within the canvas. Defaults to `1`.
   */
  viewMode?: 0 | 1 | 2 | 3
}
```

### Functions

#### `createProvider(config)`

Creates a Cropper.js-based image crop provider.

```typescript
function createProvider(config?: CropperjsConfig): ImageCropProvider
```

- `config` — Optional provider-level defaults (`guides`, `background`, `viewMode`).

**Returns:** A configured `ImageCropProvider` backed by real cropperjs instances.

### Constants

#### `provider`

Default Cropper.js provider instance.

```typescript
const provider: ImageCropProvider
```

### Namespaces

#### `Cropper`

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

- **Import cropperjs's stylesheet yourself** — this package does NOT:
  `import 'cropperjs/dist/cropper.css'`. Without it the crop box, handles, and
  drag guides render unstyled (an invisible/broken cropper), the same way Quill
  needs its theme CSS.
- **Browser-only.** `createCropper()` calls `document.createElement('img')` and
  `new Cropper(...)`; construct it in a client-only effect under SSR.
- **cropperjs initializes on the image's `load` event.** Reading `getCropData()`
  or `getCroppedCanvas()` before the source has loaded returns empty/degenerate
  data — drive them after load, or set the region explicitly with `setCropData()`
  in natural-image coordinates first.
- **`circular` is a UI concern, not a pixel op.** cropperjs has no circular
  pixel output; for a round avatar, style the crop box round in CSS
  (`.cropper-view-box, .cropper-face { border-radius: 50% }`) and draw the
  returned canvas into a rounded canvas before upload.
- **`OutputOptions.quality` applies at encode time**, not to canvas generation —
  pass it to `canvas.toBlob(cb, 'image/jpeg', quality)` / `toDataURL(type, quality)`.
- Provider defaults (`guides`, `background`, `viewMode`) come from
  `createProvider(config)`; per-cropper `CropperOptions.guides` wins over the
  config default. `maxWidth`/`maxHeight` are enforced on output (cropperjs has no
  max-crop-box constructor option).
- **Wire with `setProvider()` from `@molecule/app-image-crop`** — the core keeps a
  module-local singleton; a generic `bond('image-crop', …)` silently no-ops and
  `requireProvider()` throws.

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
