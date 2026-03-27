/**
 * Sharp image provider for molecule.dev.
 *
 * High-performance, native image processing powered by libvips via Sharp.
 * Supports resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop operations.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-image'
 * import { provider } from '@molecule/api-image-sharp'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
