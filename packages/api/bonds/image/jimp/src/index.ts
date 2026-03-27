/**
 * Jimp image provider for molecule.dev.
 *
 * Pure-JavaScript image processing with zero native dependencies.
 * Supports resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop operations.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-image'
 * import { provider } from '@molecule/api-image-jimp'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
