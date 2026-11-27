/**
 * File picker for iOS and Android using Expo SDK 53.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-file-picker'
 * import { provider } from '@molecule/app-file-picker-expo'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * The app supplies expo-document-picker and expo-file-system. Selected files are
 * copied into app cache and can be read or uploaded while that copy is available.
 *
 * @module
 */

export * from './provider.js'
