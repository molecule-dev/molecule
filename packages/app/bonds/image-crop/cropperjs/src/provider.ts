/**
 * Cropper.js image crop provider implementation.
 *
 * Wraps cropperjs v1 (`new Cropper(imageElement, options)`) behind the molecule
 * `ImageCropProvider` / `CropperInstance` contract. Every instance method
 * delegates to the corresponding real cropperjs call, so `getCroppedCanvas()`
 * returns the actual cropped `<canvas>` — not a placeholder.
 *
 * @module
 */

import Cropper from 'cropperjs'

import type {
  CropData,
  CropperInstance,
  CropperOptions,
  ImageCropProvider,
  OutputOptions,
} from '@molecule/app-image-crop'

import type { CropperjsConfig } from './types.js'

/**
 * Maps the core `CropperOptions` (plus provider-level config defaults) onto the
 * cropperjs constructor `Options`. `aspectRatio` / `minCropBoxWidth` /
 * `minCropBoxHeight` are only set when provided so cropperjs keeps its own
 * free-form / unconstrained defaults otherwise. (Max crop size has no
 * constructor equivalent in cropperjs — it is enforced on output via
 * `getCroppedCanvas`; see `toGetCroppedCanvasOptions`.)
 *
 * @param options - The core cropper options for this instance.
 * @param config - Provider-level defaults from `createProvider`.
 * @returns cropperjs constructor options.
 */
const toCropperOptions = (
  options: CropperOptions,
  config: CropperjsConfig,
): Cropper.Options<HTMLImageElement> => {
  const cropperOptions: Cropper.Options<HTMLImageElement> = {
    viewMode: config.viewMode ?? 1,
    guides: options.guides ?? config.guides ?? true,
    background: config.background ?? true,
    autoCrop: true,
  }
  if (options.aspectRatio !== undefined) {
    cropperOptions.aspectRatio = options.aspectRatio
  }
  if (options.minWidth !== undefined) {
    cropperOptions.minCropBoxWidth = options.minWidth
  }
  if (options.minHeight !== undefined) {
    cropperOptions.minCropBoxHeight = options.minHeight
  }
  return cropperOptions
}

/**
 * Maps the core `OutputOptions` and the cropper's min/max size constraints onto
 * cropperjs `getCroppedCanvas` options. `quality` is intentionally NOT mapped:
 * it is an encode-time setting for `canvas.toBlob`/`toDataURL`, not a
 * canvas-generation parameter.
 *
 * @param options - The core cropper options (for min/max size constraints).
 * @param output - Optional per-call output options.
 * @returns cropperjs `getCroppedCanvas` options.
 */
const toGetCroppedCanvasOptions = (
  options: CropperOptions,
  output: OutputOptions | undefined,
): Cropper.GetCroppedCanvasOptions => {
  const canvasOptions: Cropper.GetCroppedCanvasOptions = {}
  if (output?.width !== undefined) {
    canvasOptions.width = output.width
  }
  if (output?.height !== undefined) {
    canvasOptions.height = output.height
  }
  if (output?.fillColor !== undefined) {
    canvasOptions.fillColor = output.fillColor
  }
  if (options.minWidth !== undefined) {
    canvasOptions.minWidth = options.minWidth
  }
  if (options.minHeight !== undefined) {
    canvasOptions.minHeight = options.minHeight
  }
  if (options.maxWidth !== undefined) {
    canvasOptions.maxWidth = options.maxWidth
  }
  if (options.maxHeight !== undefined) {
    canvasOptions.maxHeight = options.maxHeight
  }
  return canvasOptions
}

/**
 * Creates a Cropper.js-based image crop provider.
 *
 * @param config - Optional provider-level defaults (`guides`, `background`, `viewMode`).
 * @returns A configured `ImageCropProvider` backed by real cropperjs instances.
 */
export function createProvider(config: CropperjsConfig = {}): ImageCropProvider {
  return {
    name: 'cropperjs',

    createCropper(options: CropperOptions): CropperInstance {
      // cropperjs mounts on an <img>; the core contract only gives us `src`, so
      // we create the image element here. cropperjs initializes on the image's
      // `load` event — read crop data / export after load (or set the region
      // explicitly via setCropData first).
      const image = document.createElement('img')
      image.src = options.src

      const cropper = new Cropper(image, toCropperOptions(options, config))

      return {
        getCroppedCanvas(outputOptions?: OutputOptions): HTMLCanvasElement {
          return cropper.getCroppedCanvas(toGetCroppedCanvasOptions(options, outputOptions))
        },

        getCropData(): CropData {
          return cropper.getData()
        },

        setCropData(data: CropData): void {
          cropper.setData(data)
        },

        reset(): void {
          cropper.reset()
        },

        rotate(degrees: number): void {
          cropper.rotate(degrees)
        },

        zoom(ratio: number): void {
          cropper.zoom(ratio)
        },

        destroy(): void {
          cropper.destroy()
          image.remove()
        },
      }
    },
  }
}

/** Default Cropper.js provider instance. */
export const provider: ImageCropProvider = createProvider()
