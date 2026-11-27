/**
 * Portable file picker interface for molecule.dev.
 *
 * Bond a device chooser at startup. The chooser returns ordered portable file
 * values whose bytes can be read or uploaded later.
 *
 * @example
 * ```typescript
 * import { getProvider, setProvider } from '@molecule/app-file-picker'
 * import { provider } from '@molecule/app-file-picker-expo'
 *
 * setProvider(provider)
 *
 * async function selectImages() {
 *   return getProvider()?.pickFiles({ accept: 'image/*', multiple: true })
 * }
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
