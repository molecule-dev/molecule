/**
 * Device type definitions.
 *
 * Types are inferred from Zod schemas in schema.ts.
 *
 * @module
 */

import type * as resourceTypes from '@molecule/api-resource/types'

// Re-export all types from schema
export type {
  APNPushSubscription,
  CreateProps,
  FCMPushSubscription,
  Props,
  PushProps,
  PushSubscription,
  UpdateProps,
} from './schema.js'

/**
 * An object describing the `device` resource.
 */
export type Resource<T = unknown> = resourceTypes.Resource<T>

/**
 * DeviceService interface for the bond system.
 *
 * Provides device CRUD operations that other resources
 * can use through `get<DeviceService>('device')`.
 */
export interface DeviceService {
  createOrUpdate(userId: string, deviceName: string): Promise<string | null>
  updateLastSeen(deviceId: string): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  /**
   * Delete every device row owned by `userId` EXCEPT `keepDeviceId` — the session
   * making the current request. Used by a password change: every other device is
   * revoked, while the token the caller is holding stays valid. Optional so a
   * custom device service that predates this method keeps compiling; the caller
   * falls back to {@link deleteByUserId} when it is absent.
   * @param userId - The user whose other devices should be removed.
   * @param keepDeviceId - The device id to keep (the caller's own session).
   */
  deleteOthersByUserId?(userId: string, keepDeviceId: string): Promise<void>
  /**
   * Whether a device row still exists. Used by the user resource's session
   * authorization to enforce server-side revocation: a deleted device (logout,
   * remote device removal, password-reset invalidation) makes this return
   * `false`, so the JWT bound to it is rejected for every copy of the token.
   * @param deviceId - The device id to check.
   * @returns `true` if the device exists, `false` if it was deleted/never existed.
   */
  exists(deviceId: string): Promise<boolean>
  /**
   * Delete a single device row by id, terminating that session. Used by the
   * logout handler and remote device-revocation route. Combined with the
   * `exists`-based revocation check in session authorization, this makes a
   * logout effective for every copy of the device's JWT.
   * @param deviceId - The device id to delete.
   */
  delete(deviceId: string): Promise<void>
  getWithPushSubscription(
    userId: string,
  ): Promise<Array<{ id: string; pushPlatform: string; pushSubscription: unknown }>>
}
