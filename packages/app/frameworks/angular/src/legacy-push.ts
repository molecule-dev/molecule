import * as feature from './push.js'

/**
 * Compatibility alias for `PushService`.
 * @deprecated Import PushService from `@molecule/app-angular/push`.
 */
export type PushService = feature.PushService

/**
 * Compatibility alias for `UsePushOptions`.
 * @deprecated Import UsePushOptions from `@molecule/app-angular/push`.
 */
export type UsePushOptions = feature.UsePushOptions

/**
 * Compatibility alias for `UsePushResult`.
 * @deprecated Import UsePushResult from `@molecule/app-angular/push`.
 */
export type UsePushResult = feature.UsePushResult

/**
 * Compatibility alias for `createPushService`.
 * @deprecated Import createPushService from `@molecule/app-angular/push`.
 */
export const createPushService: typeof feature.createPushService = feature.createPushService

/**
 * Compatibility alias for `usePush`.
 * @deprecated Import usePush from `@molecule/app-angular/push`.
 */
export const usePush: typeof feature.usePush = feature.usePush
