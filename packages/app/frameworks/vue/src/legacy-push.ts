import * as feature from './push.js'

/**
 * Compatibility alias for `UsePushOptions`.
 * @deprecated Import UsePushOptions from `@molecule/app-vue/push`.
 */
export type UsePushOptions = feature.UsePushOptions

/**
 * Compatibility alias for `UsePushResult`.
 * @deprecated Import UsePushResult from `@molecule/app-vue/push`.
 */
export type UsePushResult = feature.UsePushResult

/**
 * Compatibility alias for `UsePushReturn`.
 * @deprecated Import UsePushReturn from `@molecule/app-vue/push`.
 */
export type UsePushReturn = feature.UsePushReturn

/**
 * Compatibility alias for `usePush`.
 * @deprecated Import usePush from `@molecule/app-vue/push`.
 */
export const usePush: typeof feature.usePush = feature.usePush
