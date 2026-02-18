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
  getWithPushSubscription(
    userId: string,
  ): Promise<Array<{ id: string; pushPlatform: string; pushSubscription: unknown }>>
}
