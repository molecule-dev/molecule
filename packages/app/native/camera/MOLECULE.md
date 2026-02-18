# @molecule/app-camera

Camera interface for molecule.dev.

Provides a unified API for camera access that works across
different platforms (web, Capacitor, React Native, etc.).

## Type
`native`

## Installation
```bash
npm install @molecule/app-camera
```

## API

### Interfaces

#### `CameraProvider`

Camera provider interface.

All camera providers must implement this interface.

```typescript
interface CameraProvider {
  /**
   * Check the camera permission status.
   * @returns The permission status: 'granted', 'denied', or 'prompt'.
   */
  checkPermission(): Promise<CameraPermission>

  /**
   * Requests camera permission.
   */
  requestPermission(): Promise<CameraPermission>

  /**
   * Takes a photo.
   */
  getPhoto(options?: PhotoOptions): Promise<Photo>

  /**
   * Records a video.
   */
  getVideo(options?: VideoOptions): Promise<Video>

  /**
   * Picks multiple photos from gallery.
   */
  pickPhotos(options?: Omit<PhotoOptions, 'source'> & { limit?: number }): Promise<Photo[]>

  /**
   * Starts camera preview.
   */
  startPreview(options: PreviewOptions): Promise<void>

  /**
   * Stops camera preview.
   */
  stopPreview(): Promise<void>

  /**
   * Captures frame from preview.
   */
  capturePreview(options?: { quality?: ImageQuality }): Promise<Photo>

  /**
   * Flips camera direction during preview.
   */
  flipCamera(): Promise<void>

  /**
   * Checks if a torch/flash is available.
   */
  hasTorch(): Promise<boolean>

  /**
   * Toggles torch/flash during preview.
   */
  toggleTorch(enabled: boolean): Promise<void>

  /**
   * Destroys the provider.
   */
  destroy(): void
}
```

#### `Photo`

Captured or selected photo data, available as base64, data URL, or file URI.

```typescript
interface Photo {
  /**
   * Base64 encoded image (if resultType is 'base64').
   */
  base64?: string

  /**
   * Data URL (if resultType is 'dataUrl').
   */
  dataUrl?: string

  /**
   * File URI (if resultType is 'uri').
   */
  uri?: string

  /**
   * Web path for display.
   */
  webPath?: string

  /**
   * Image format.
   */
  format: ImageFormat

  /**
   * Whether the image was saved to gallery.
   */
  savedToGallery?: boolean

  /**
   * EXIF data (if available).
   */
  exifData?: Record<string, unknown>
}
```

#### `PhotoOptions`

Configuration for taking or selecting a photo (source, quality, dimensions, format).

```typescript
interface PhotoOptions {
  /**
   * Image source.
   */
  source?: CameraSource

  /**
   * Camera direction (for camera source).
   */
  direction?: CameraDirection

  /**
   * Image quality (0-100).
   */
  quality?: ImageQuality

  /**
   * Whether to allow editing.
   */
  allowEditing?: boolean

  /**
   * Result type.
   */
  resultType?: 'base64' | 'dataUrl' | 'uri'

  /**
   * Save to gallery.
   */
  saveToGallery?: boolean

  /**
   * Maximum width (will scale down if larger).
   */
  width?: number

  /**
   * Maximum height (will scale down if larger).
   */
  height?: number

  /**
   * Output format.
   */
  format?: ImageFormat

  /**
   * Prompt labels for UI.
   */
  promptLabelHeader?: string
  promptLabelPhoto?: string
  promptLabelPicture?: string
  promptLabelCancel?: string
}
```

#### `PreviewOptions`

Camera preview options.

```typescript
interface PreviewOptions {
  /**
   * Parent element to attach preview to.
   */
  parent: HTMLElement

  /**
   * Which camera to use: front (selfie) or rear (main).
   */
  direction?: CameraDirection

  /**
   * Preview width.
   */
  width?: number

  /**
   * Preview height.
   */
  height?: number

  /**
   * Position (CSS values).
   */
  position?: {
    x: number
    y: number
  }
}
```

#### `Video`

Recorded video data with file URI, web path, duration, and MIME type.

```typescript
interface Video {
  /**
   * File URI.
   */
  uri: string

  /**
   * Web path for playback.
   */
  webPath?: string

  /**
   * Duration in seconds.
   */
  duration?: number

  /**
   * MIME type.
   */
  mimeType?: string
}
```

#### `VideoOptions`

Configuration for recording a video (max duration, quality, camera direction).

```typescript
interface VideoOptions {
  /**
   * Maximum duration in seconds.
   */
  duration?: number

  /**
   * Video quality.
   */
  quality?: 'low' | 'medium' | 'high'

  /**
   * Which camera to use: front (selfie) or rear (main).
   */
  direction?: CameraDirection
}
```

### Types

#### `CameraDirection`

Which camera to use: front (selfie) or rear (main).

```typescript
type CameraDirection = 'front' | 'rear'
```

#### `CameraPermission`

Camera permission status.

```typescript
type CameraPermission = 'granted' | 'denied' | 'prompt'
```

#### `CameraSource`

Where to acquire the image from: device camera, photo library, or prompt the user to choose.

```typescript
type CameraSource = 'camera' | 'photos' | 'prompt'
```

#### `ImageFormat`

Image result format.

```typescript
type ImageFormat = 'jpeg' | 'png' | 'webp'
```

#### `ImageQuality`

Image quality (0-100).

```typescript
type ImageQuality = number
```

### Functions

#### `capturePreview(options, options)`

Capture a still frame from the active camera preview.

```typescript
function capturePreview(options?: { quality?: ImageQuality; }): Promise<Photo>
```

- `options` — Capture options including image quality.
- `options` — .quality - The image quality for the captured frame.

**Returns:** The captured Photo from the preview stream.

#### `checkPermission()`

Check the camera permission status.

```typescript
function checkPermission(): Promise<CameraPermission>
```

**Returns:** The permission status: 'granted', 'denied', or 'prompt'.

#### `createWebCameraProvider()`

Create a web-based camera provider using the MediaDevices API.
Supports photo capture, gallery picking, camera preview, and torch control in browsers.

```typescript
function createWebCameraProvider(): CameraProvider
```

**Returns:** A CameraProvider implementation backed by browser APIs.

#### `flipCamera()`

Flip the camera direction (front/rear) during an active preview.

```typescript
function flipCamera(): Promise<void>
```

**Returns:** A promise that resolves when the camera direction is flipped.

#### `getPhoto(options)`

Take a photo using the camera or pick from the photo library.

```typescript
function getPhoto(options?: PhotoOptions): Promise<Photo>
```

- `options` — Photo options (source, quality, dimensions, format).

**Returns:** The captured or selected Photo with base64, dataUrl, or URI.

#### `getProvider()`

Get the current camera provider. Falls back to a web-based provider using getUserMedia if none is set.

```typescript
function getProvider(): CameraProvider
```

**Returns:** The active CameraProvider instance.

#### `hasProvider()`

Check if a camera provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a CameraProvider has been bonded.

#### `pickPhotos(options)`

Pick multiple photos from the device gallery.

```typescript
function pickPhotos(options?: (Omit<PhotoOptions, "source"> & { limit?: number; })): Promise<Photo[]>
```

- `options` — Photo options (quality, dimensions, format) plus an optional limit.

**Returns:** An array of selected Photo objects.

#### `requestPermission()`

Request camera permission from the user.

```typescript
function requestPermission(): Promise<CameraPermission>
```

**Returns:** The resulting permission status after the request.

#### `setProvider(provider)`

Set the camera provider implementation.

```typescript
function setProvider(provider: CameraProvider): void
```

- `provider` — CameraProvider implementation to register.

#### `startPreview(options)`

Start a live camera preview attached to a parent HTML element.

```typescript
function startPreview(options: PreviewOptions): Promise<void>
```

- `options` — Preview configuration (parent element, direction, dimensions).

**Returns:** A promise that resolves when the preview starts.

#### `stopPreview()`

Stop the active camera preview.

```typescript
function stopPreview(): Promise<void>
```

**Returns:** A promise that resolves when the preview stops.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-camera`.
