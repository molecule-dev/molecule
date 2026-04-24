# @molecule/app-image-crop

Image crop core interface for molecule.dev.

Provides a standardized API for image cropping UI components.
Bond a provider (e.g. `@molecule/app-image-crop-cropperjs`) to
supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider } from '@molecule/app-image-crop'

const cropper = requireProvider().createCropper({
  src: '/photos/avatar.jpg',
  aspectRatio: 1,
  circular: true,
})
const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
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
