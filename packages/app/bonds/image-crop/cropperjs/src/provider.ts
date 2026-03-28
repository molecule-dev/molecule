/**
 * Cropper.js-compatible image crop provider implementation.
 *
 * @module
 */

import type {
  CropData,
  CropperInstance,
  CropperOptions,
  ImageCropProvider,
  OutputOptions,
} from '@molecule/app-image-crop'

import type { CropperjsConfig } from './types.js'

/**
 * Creates a Cropper.js-based image crop provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured ImageCropProvider.
 */
export function createProvider(_config?: CropperjsConfig): ImageCropProvider {
  return {
    name: 'cropperjs',

    createCropper(options: CropperOptions): CropperInstance {
      let cropData: CropData = {
        x: 0,
        y: 0,
        width: options.minWidth ?? 100,
        height: options.minHeight ?? 100,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      }

      return {
        getCroppedCanvas(_outputOptions?: OutputOptions): HTMLCanvasElement {
          // In a real implementation, this would create and return a canvas
          // For the interface conformance, we return a placeholder
          return {} as HTMLCanvasElement
        },

        getCropData(): CropData {
          return { ...cropData }
        },

        setCropData(data: CropData): void {
          cropData = { ...data }
        },

        reset(): void {
          cropData = {
            x: 0,
            y: 0,
            width: options.minWidth ?? 100,
            height: options.minHeight ?? 100,
            rotate: 0,
            scaleX: 1,
            scaleY: 1,
          }
        },

        rotate(degrees: number): void {
          cropData.rotate = (cropData.rotate + degrees) % 360
        },

        zoom(ratio: number): void {
          cropData.scaleX = Math.max(0.1, cropData.scaleX + ratio)
          cropData.scaleY = Math.max(0.1, cropData.scaleY + ratio)
        },

        destroy(): void {
          // Clean up resources
        },
      }
    },
  }
}

/** Default Cropper.js provider instance. */
export const provider: ImageCropProvider = createProvider()
