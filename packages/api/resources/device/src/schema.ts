/**
 * Device resource schema definitions using Zod.
 *
 * Types are automatically inferred from schemas using z.infer<>.
 *
 * @module
 */

import { z } from 'zod'

import { basePropsSchema } from '@molecule/api-resource/schema'

/**
 * Web Push subscription keys schema.
 */
export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string(),
  auth: z.string(),
})

/**
 * Web Push subscription schema.
 */
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().optional(),
  keys: pushSubscriptionKeysSchema.optional(),
})

/**
 * FCM push subscription schema.
 */
export const fcmPushSubscriptionSchema = z.object({
  registrationId: z.string(),
  registrationType: z.literal('FCM'),
})

/**
 * APN push subscription schema.
 */
export const apnPushSubscriptionSchema = z.object({
  registrationId: z.string(),
})

/**
 * Combined push subscription schema (union of all types).
 */
export const pushSubscriptionSchema = z
  .union([webPushSubscriptionSchema, fcmPushSubscriptionSchema, apnPushSubscriptionSchema])
  .nullable()
  .optional()

/**
 * The full schema for device props.
 */
export const propsSchema = basePropsSchema.extend({
  /**
   * The device owner's userId.
   */
  userId: z.string(),
  /**
   * The name of the device.
   */
  name: z.string().optional(),
  /**
   * The platform when pushing notifications.
   */
  pushPlatform: z.enum(['fcm', 'apn']).optional(),
  /**
   * The subscription data when pushing notifications.
   */
  pushSubscription: pushSubscriptionSchema,
  /**
   * True when the user has push notifications enabled.
   */
  hasPushSubscription: z.boolean().optional(),
})

/**
 * Full device record properties (userId, name, push platform/subscription, timestamps).
 */
export type Props = z.infer<typeof propsSchema>

/**
 * Web Push subscription type.
 */
export type PushSubscription = z.infer<typeof webPushSubscriptionSchema>

/**
 * FCM push subscription type.
 */
export type FCMPushSubscription = z.infer<typeof fcmPushSubscriptionSchema>

/**
 * APN push subscription type.
 */
export type APNPushSubscription = z.infer<typeof apnPushSubscriptionSchema>

/**
 * Schema for creating a device.
 */
export const createPropsSchema = propsSchema.pick({
  userId: true,
  name: true,
  pushPlatform: true,
  pushSubscription: true,
  hasPushSubscription: true,
})

/**
 * Fields required when registering a new device (userId, name, push subscription).
 */
export type CreateProps = z.infer<typeof createPropsSchema>

/**
 * Zod schema for updating a device (partial pick of name, push platform, push subscription).
 */
export const updatePropsSchema = propsSchema
  .pick({
    name: true,
    pushPlatform: true,
    pushSubscription: true,
    hasPushSubscription: true,
  })
  .partial()

/**
 * Updatable device fields (name, push platform, push subscription).
 */
export type UpdateProps = z.infer<typeof updatePropsSchema>

/**
 * Zod schema for push notification properties (device ID, platform, subscription).
 */
export const pushPropsSchema = z.object({
  id: z.string().uuid(),
  pushPlatform: z.enum(['fcm', 'apn']).optional(),
  pushSubscription: pushSubscriptionSchema,
})

/**
 * Push notification properties for a device (device ID, platform, subscription data).
 */
export type PushProps = z.infer<typeof pushPropsSchema>

/**
 * Re-export zod for convenience.
 */
export { z }
