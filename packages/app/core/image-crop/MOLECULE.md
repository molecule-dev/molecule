# @molecule/app-image-crop

Image crop core interface for molecule.dev.

Framework-agnostic contract for image cropping: crop-region **state**
(rect, rotation, zoom) plus cropped-canvas output. Bond a provider (e.g.
`@molecule/app-image-crop-cropperjs`) to supply the crop math; your UI
renders the preview and drag handles and feeds gestures into the instance.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-image-crop'
import { provider } from '@molecule/app-image-crop-cropperjs'

setProvider(provider)                    // once, at app startup (bonds.ts)

const cropper = requireProvider().createCropper({
  src: '/photos/avatar.jpg',
  aspectRatio: 1,
  circular: true,
})
const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
canvas.toBlob((blob) => uploadAvatar(blob))
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-image-crop
```

## API

### Interfaces

#### `CropData`

Crop region data describing the selected area and transformations.

```typescript
interface CropData {
  /** X coordinate of the crop area origin. */
  x: number

  /** Y coordinate of the crop area origin. */
  y: number

  /** Width of the crop area. */
  width: number

  /** Height of the crop area. */
  height: number

  /** Rotation angle in degrees. */
  rotate: number

  /** Horizontal scale factor. */
  scaleX: number

  /** Vertical scale factor. */
  scaleY: number
}
```

#### `CropperInstance`

A live cropper instance returned by the provider.

```typescript
interface CropperInstance {
  /**
   * Generates a canvas element containing the cropped image.
   *
   * @param options - Optional output configuration.
   * @returns An HTMLCanvasElement with the cropped result.
   */
  getCroppedCanvas(options?: OutputOptions): HTMLCanvasElement

  /**
   * Returns the current crop region data.
   *
   * @returns The current crop data.
   */
  getCropData(): CropData

  /**
   * Sets the crop region programmatically.
   *
   * @param data - The crop data to apply.
   */
  setCropData(data: CropData): void

  /**
   * Resets the cropper to its initial state.
   */
  reset(): void

  /**
   * Rotates the image by the specified degrees.
   *
   * @param degrees - Rotation angle in degrees (positive = clockwise).
   */
  rotate(degrees: number): void

  /**
   * Zooms the image by the specified ratio.
   *
   * @param ratio - Zoom ratio (positive to zoom in, negative to zoom out).
   */
  zoom(ratio: number): void

  /**
   * Destroys the cropper instance and cleans up resources.
   */
  destroy(): void
}
```

#### `CropperOptions`

Configuration options for creating an image cropper.

```typescript
interface CropperOptions {
  /** Source image URL or data URI. */
  src: string

  /** Fixed aspect ratio (width / height). `undefined` for free-form. */
  aspectRatio?: number

  /** Minimum crop width in pixels. */
  minWidth?: number

  /** Minimum crop height in pixels. */
  minHeight?: number

  /** Maximum crop width in pixels. */
  maxWidth?: number

  /** Maximum crop height in pixels. */
  maxHeight?: number

  /** Whether the crop area should be circular. Defaults to `false`. */
  circular?: boolean

  /** Whether to show crop guide lines. Defaults to `true`. */
  guides?: boolean
}
```

#### `ImageCropProvider`

Image crop provider interface.

All image crop providers must implement this interface to create
and manage image cropping UI.

```typescript
interface ImageCropProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new cropper instance.
   *
   * @param options - Configuration for the cropper.
   * @returns A cropper instance for managing the crop operation.
   */
  createCropper(options: CropperOptions): CropperInstance
}
```

#### `OutputOptions`

Output options for generating the cropped image.

```typescript
interface OutputOptions {
  /** Output width in pixels. */
  width?: number

  /** Output height in pixels. */
  height?: number

  /** Fill color for empty areas (e.g. after rotation). Defaults to `'transparent'`. */
  fillColor?: string

  /** Image quality for lossy formats (0-1). Defaults to `1`. */
  quality?: number
}
```

### Functions

#### `getProvider()`

Retrieves the bonded image crop provider, or `null` if none is bonded.

```typescript
function getProvider(): ImageCropProvider | null
```

**Returns:** The active image crop provider, or `null`.

#### `hasProvider()`

Checks whether an image crop provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an image crop provider is available.

#### `requireProvider()`

Retrieves the bonded image crop provider, throwing if none is configured.

```typescript
function requireProvider(): ImageCropProvider
```

**Returns:** The active image crop provider.

#### `setProvider(provider)`

Registers an image crop provider as the active singleton.

```typescript
function setProvider(provider: ImageCropProvider): void
```

- `provider` — The image crop provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Image Crop | `@molecule/app-image-crop-cropperjs` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

- **The instance is headless — no crop UI mounts anywhere.** Render the image,
  crop-box overlay, and handles yourself (styled via `getClassMap()`/`cm.*`) and
  translate drag/resize gestures into `setCropData()` / `rotate()` / `zoom()`;
  read `getCropData()` to draw the overlay.
- **Verify the cropped output end-to-end before shipping** — draw the returned
  canvas into the page or upload-and-render it; an empty/blank result means the
  bonded provider does not implement canvas output, which is an integration bug
  to fix, not to skip.
- **Wire with THIS package's `setProvider()` or `bond('image-crop', …)`** —
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
  write the same slot; `requireProvider()` throws until one has run.
- Upload the result as a Blob (`canvas.toBlob`) through your upload path; the
  server must re-validate the file (type/size) — client cropping is UX, not a
  boundary.

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
