/**
 * Camera provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  CameraPermission,
  CameraProvider,
  ImageQuality,
  Photo,
  PhotoOptions,
  PreviewOptions,
} from './types.js'
import { createWebCameraProvider } from './web-provider.js'

const BOND_TYPE = 'camera'

/**
 * Set the camera provider implementation.
 * @param provider - CameraProvider implementation to register.
 */
export const setProvider = (provider: CameraProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current camera provider. Falls back to a web-based provider using getUserMedia if none is set.
 * @returns The active CameraProvider instance.
 */
export const getProvider = (): CameraProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebCameraProvider())
  }
  return bondGet<CameraProvider>(BOND_TYPE)!
}

/**
 * Check if a camera provider has been registered.
 * @returns Whether a CameraProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Check the camera permission status.
 * @returns The permission status: 'granted', 'denied', or 'prompt'.
 */
export const checkPermission = (): Promise<CameraPermission> => getProvider().checkPermission()

/**
 * Request camera permission from the user.
 * @returns The resulting permission status after the request.
 */
export const requestPermission = (): Promise<CameraPermission> => getProvider().requestPermission()

/**
 * Take a photo using the camera or pick from the photo library.
 * @param options - Photo options (source, quality, dimensions, format).
 * @returns The captured or selected Photo with base64, dataUrl, or URI.
 */
export const getPhoto = (options?: PhotoOptions): Promise<Photo> => getProvider().getPhoto(options)

/**
 * Pick multiple photos from the device gallery.
 * @param options - Photo options (quality, dimensions, format) plus an optional limit.
 * @returns An array of selected Photo objects.
 */
export const pickPhotos = (
  options?: Omit<PhotoOptions, 'source'> & { limit?: number },
): Promise<Photo[]> => getProvider().pickPhotos(options)

/**
 * Start a live camera preview attached to a parent HTML element.
 * @param options - Preview configuration (parent element, direction, dimensions).
 * @returns A promise that resolves when the preview starts.
 */
export const startPreview = (options: PreviewOptions): Promise<void> =>
  getProvider().startPreview(options)

/**
 * Stop the active camera preview.
 * @returns A promise that resolves when the preview stops.
 */
export const stopPreview = (): Promise<void> => getProvider().stopPreview()

/**
 * Capture a still frame from the active camera preview.
 * @param options - Capture options including image quality.
 * @param options.quality - The image quality for the captured frame.
 * @returns The captured Photo from the preview stream.
 */
export const capturePreview = (options?: { quality?: ImageQuality }): Promise<Photo> =>
  getProvider().capturePreview(options)

/**
 * Flip the camera direction (front/rear) during an active preview.
 * @returns A promise that resolves when the camera direction is flipped.
 */
export const flipCamera = (): Promise<void> => getProvider().flipCamera()
