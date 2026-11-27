import * as feature from './push.js'

/**
 * Compatibility alias for `UsePushOptions`.
 * @deprecated Import UsePushOptions from `@molecule/app-svelte/push`.
 */
export type UsePushOptions = feature.UsePushOptions

/**
 * Compatibility alias for `UsePushResult`.
 * @deprecated Import UsePushResult from `@molecule/app-svelte/push`.
 */
export type UsePushResult = feature.UsePushResult

/**
 * Compatibility alias for `createPushStores`.
 * @deprecated Import createPushStores from `@molecule/app-svelte/push`.
 */
export const createPushStores: typeof feature.createPushStores = feature.createPushStores

/**
 * Compatibility alias for `usePush`.
 * @deprecated Import usePush from `@molecule/app-svelte/push`.
 */
export const usePush: typeof feature.usePush = feature.usePush
