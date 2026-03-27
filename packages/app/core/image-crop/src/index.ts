/**
 * Image crop core interface for molecule.dev.
 *
 * Provides a standardized API for image cropping UI components.
 * Bond a provider (e.g. `@molecule/app-image-crop-cropperjs`) to
 * supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-image-crop'
 *
 * const cropper = requireProvider().createCropper({
 *   src: '/photos/avatar.jpg',
 *   aspectRatio: 1,
 *   circular: true,
 * })
 * const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
 * ```
 */

export * from './provider.js'
export * from './types.js'
