# @molecule/api-image

Provider-agnostic image processing interface for molecule.dev.

Defines the `ImageProvider` interface for resizing, cropping, converting,
thumbnailing, optimizing, and extracting metadata from images. Bond packages
(Sharp, Jimp, etc.) implement this interface. Application code uses the
convenience functions (`resize`, `crop`, `convert`, `thumbnail`, `optimize`,
`getMetadata`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, resize, convert, getMetadata } from '@molecule/api-image'
import { provider as sharp } from '@molecule/api-image-sharp'

setProvider(sharp)
const resized = await resize(imageBuffer, { width: 800, height: 600, fit: 'cover' })
const webp = await convert(imageBuffer, 'webp', 80)
const meta = await getMetadata(imageBuffer)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-image
```

## API

### Interfaces

#### `CropOptions`

Image crop options specifying a rectangular region.

```typescript
interface CropOptions {
  /** Left offset in pixels. */
  left: number

  /** Top offset in pixels. */
  top: number

  /** Width of the crop region in pixels. */
  width: number

  /** Height of the crop region in pixels. */
  height: number
}
```

#### `ImageMetadata`

Image metadata extracted from a buffer.

```typescript
interface ImageMetadata {
  /** Image width in pixels. */
  width: number

  /** Image height in pixels. */
  height: number

  /** Detected image format (e.g., `'jpeg'`, `'png'`). */
  format: string

  /** File size in bytes. */
  size: number

  /** Whether the image has an alpha channel. */
  hasAlpha: boolean

  /** Number of color channels (e.g., 3 for RGB, 4 for RGBA). */
  channels?: number

  /** Image density (DPI) if available. */
  density?: number

  /** Image orientation from EXIF data if available. */
  orientation?: number
}
```

#### `ImageProvider`

Image processing provider interface.

All image processing providers must implement this interface.
Bond packages (Sharp, Jimp, etc.) provide concrete implementations.

```typescript
interface ImageProvider {
  /**
   * Resizes an image to the specified dimensions.
   *
   * @param input - Image data as a Buffer.
   * @param options - Resize dimensions and fit mode.
   * @returns The resized image as a Buffer.
   */
  resize(input: Buffer, options: ResizeOptions): Promise<Buffer>

  /**
   * Crops an image to a rectangular region.
   *
   * @param input - Image data as a Buffer.
   * @param options - Crop region coordinates and dimensions.
   * @returns The cropped image as a Buffer.
   */
  crop(input: Buffer, options: CropOptions): Promise<Buffer>

  /**
   * Converts an image to a different format.
   *
   * @param input - Image data as a Buffer.
   * @param format - Target image format.
   * @param quality - Optional quality percentage (1–100).
   * @returns The converted image as a Buffer.
   */
  convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer>

  /**
   * Generates a square thumbnail from an image.
   *
   * @param input - Image data as a Buffer.
   * @param size - Thumbnail side length in pixels.
   * @returns The thumbnail image as a Buffer.
   */
  thumbnail(input: Buffer, size: number): Promise<Buffer>

  /**
   * Optimizes an image for file size with optional format conversion.
   *
   * @param input - Image data as a Buffer.
   * @param options - Optimization options (format, quality, strip metadata).
   * @returns The optimized image as a Buffer.
   */
  optimize(input: Buffer, options?: OptimizeOptions): Promise<Buffer>

  /**
   * Extracts metadata from an image buffer.
   *
   * @param input - Image data as a Buffer.
   * @returns Metadata about the image (dimensions, format, size, etc.).
   */
  getMetadata(input: Buffer): Promise<ImageMetadata>

  /**
   * Rotates an image by the specified angle.
   *
   * @param input - Image data as a Buffer.
   * @param options - Rotation angle and background fill options.
   * @returns The rotated image as a Buffer.
   */
  rotate?(input: Buffer, options: RotateOptions): Promise<Buffer>

  /**
   * Flips an image vertically (top to bottom).
   *
   * @param input - Image data as a Buffer.
   * @returns The flipped image as a Buffer.
   */
  flip?(input: Buffer): Promise<Buffer>

  /**
   * Flops an image horizontally (left to right).
   *
   * @param input - Image data as a Buffer.
   * @returns The flopped image as a Buffer.
   */
  flop?(input: Buffer): Promise<Buffer>
}
```

#### `OptimizeOptions`

Image optimization options.

```typescript
interface OptimizeOptions {
  /** Output format. If omitted, the original format is preserved. */
  format?: ImageFormat

  /** Quality percentage (1–100). Higher values produce larger files with better quality. */
  quality?: number

  /** Whether to strip metadata (EXIF, ICC profiles, etc.). Defaults to `true`. */
  stripMetadata?: boolean

  /** Whether to generate a progressive/interlaced image. */
  progressive?: boolean
}
```

#### `ResizeOptions`

Image resize options.

```typescript
interface ResizeOptions {
  /** Target width in pixels. */
  width?: number

  /** Target height in pixels. */
  height?: number

  /** How the image should be resized to fit the target dimensions. */
  fit?: ResizeFit

  /** Background color when fit is `contain` and the image doesn't fill the target (CSS color string). */
  background?: string

  /** Whether to allow upscaling beyond original dimensions. Defaults to `false`. */
  withoutEnlargement?: boolean
}
```

#### `RotateOptions`

Rotation options.

```typescript
interface RotateOptions {
  /** Rotation angle in degrees (clockwise). */
  angle: number

  /** Background color for uncovered regions after rotation (CSS color string). */
  background?: string
}
```

### Types

#### `ImageFormat`

Supported image output formats.

```typescript
type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff'
```

#### `ResizeFit`

Resize fit modes that control how the image fits the target dimensions.

```typescript
type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
```

### Functions

#### `convert(input, format, quality)`

Converts an image to a different format.

```typescript
function convert(input: Buffer<ArrayBufferLike>, format: ImageFormat, quality?: number): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `format` — Target image format.
- `quality` — Optional quality percentage (1–100).

**Returns:** The converted image as a Buffer.

#### `crop(input, options)`

Crops an image to a rectangular region.

```typescript
function crop(input: Buffer<ArrayBufferLike>, options: CropOptions): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `options` — Crop region coordinates and dimensions.

**Returns:** The cropped image as a Buffer.

#### `flip(input)`

Flips an image vertically (top to bottom).

```typescript
function flip(input: Buffer<ArrayBufferLike>): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.

**Returns:** The flipped image as a Buffer.

#### `flop(input)`

Flops an image horizontally (left to right).

```typescript
function flop(input: Buffer<ArrayBufferLike>): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.

**Returns:** The flopped image as a Buffer.

#### `getMetadata(input)`

Extracts metadata from an image buffer.

```typescript
function getMetadata(input: Buffer<ArrayBufferLike>): Promise<ImageMetadata>
```

- `input` — Image data as a Buffer.

**Returns:** Metadata about the image (dimensions, format, size, etc.).

#### `getProvider()`

Retrieves the bonded image provider, throwing if none is configured.

```typescript
function getProvider(): ImageProvider
```

**Returns:** The bonded image provider.

#### `hasProvider()`

Checks whether an image provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an image provider is bonded.

#### `optimize(input, options)`

Optimizes an image for file size with optional format conversion.

```typescript
function optimize(input: Buffer<ArrayBufferLike>, options?: OptimizeOptions): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `options` — Optimization options (format, quality, strip metadata).

**Returns:** The optimized image as a Buffer.

#### `resize(input, options)`

Resizes an image to the specified dimensions.

```typescript
function resize(input: Buffer<ArrayBufferLike>, options: ResizeOptions): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `options` — Resize dimensions and fit mode.

**Returns:** The resized image as a Buffer.

#### `rotate(input, options)`

Rotates an image by the specified angle.

```typescript
function rotate(input: Buffer<ArrayBufferLike>, options: RotateOptions): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `options` — Rotation angle and background fill options.

**Returns:** The rotated image as a Buffer.

#### `setProvider(provider)`

Registers an image provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ImageProvider): void
```

- `provider` — The image provider implementation to bond.

#### `thumbnail(input, size)`

Generates a square thumbnail from an image.

```typescript
function thumbnail(input: Buffer<ArrayBufferLike>, size: number): Promise<Buffer<ArrayBufferLike>>
```

- `input` — Image data as a Buffer.
- `size` — Thumbnail side length in pixels.

**Returns:** The thumbnail image as a Buffer.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
