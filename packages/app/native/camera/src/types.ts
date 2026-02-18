/**
 * Camera interface types for molecule.dev.
 *
 * @module
 */

/**
 * Camera permission status.
 */
export type CameraPermission = 'granted' | 'denied' | 'prompt'

/**
 * Where to acquire the image from: device camera, photo library, or prompt the user to choose.
 */
export type CameraSource = 'camera' | 'photos' | 'prompt'

/**
 * Which camera to use: front (selfie) or rear (main).
 */
export type CameraDirection = 'front' | 'rear'

/**
 * Image result format.
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp'

/**
 * Image quality (0-100).
 */
export type ImageQuality = number

/**
 * Configuration for taking or selecting a photo (source, quality, dimensions, format).
 */
export interface PhotoOptions {
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

/**
 * Captured or selected photo data, available as base64, data URL, or file URI.
 */
export interface Photo {
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

/**
 * Configuration for recording a video (max duration, quality, camera direction).
 */
export interface VideoOptions {
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

/**
 * Recorded video data with file URI, web path, duration, and MIME type.
 */
export interface Video {
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

/**
 * Camera preview options.
 */
export interface PreviewOptions {
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

/**
 * Camera provider interface.
 *
 * All camera providers must implement this interface.
 */
export interface CameraProvider {
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
