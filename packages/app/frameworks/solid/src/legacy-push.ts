import * as feature from './push.js'

/**
 * Compatibility alias for `PushPrimitives`.
 * @deprecated Import PushPrimitives from `@molecule/app-solid/push`.
 */
export type PushPrimitives = feature.PushPrimitives

/**
 * Compatibility alias for `UsePushOptions`.
 * @deprecated Import UsePushOptions from `@molecule/app-solid/push`.
 */
export type UsePushOptions = feature.UsePushOptions

/**
 * Compatibility alias for `UsePushResult`.
 * @deprecated Import UsePushResult from `@molecule/app-solid/push`.
 */
export type UsePushResult = feature.UsePushResult

/**
 * Compatibility alias for `createPush`.
 * @deprecated Import createPush from `@molecule/app-solid/push`.
 */
export const createPush: typeof feature.createPush = feature.createPush

/**
 * Compatibility alias for `usePush`.
 * @deprecated Import usePush from `@molecule/app-solid/push`.
 */
export const usePush: typeof feature.usePush = feature.usePush
