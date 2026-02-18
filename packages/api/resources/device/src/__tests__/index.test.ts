/**
 * Tests for the Device resource types, schema, and definition.
 */

import { describe, expect, it } from 'vitest'

import { resource } from '../resource.js'
import {
  apnPushSubscriptionSchema,
  createPropsSchema,
  fcmPushSubscriptionSchema,
  propsSchema,
  pushPropsSchema,
  pushSubscriptionKeysSchema,
  pushSubscriptionSchema,
  updatePropsSchema,
  webPushSubscriptionSchema,
} from '../schema.js'
import type * as types from '../types.js'

describe('Device resource definition', () => {
  it('should have correct name', () => {
    expect(resource.name).toBe('Device')
  })

  it('should have correct tableName', () => {
    expect(resource.tableName).toBe('devices')
  })

  it('should have a schema', () => {
    expect(resource.schema).toBeDefined()
    expect(resource.schema.safeParse).toBeDefined()
  })
})

describe('pushSubscriptionKeysSchema', () => {
  it('should validate valid push subscription keys', () => {
    const validKeys = {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    }

    const result = pushSubscriptionKeysSchema.safeParse(validKeys)
    expect(result.success).toBe(true)
  })

  it('should reject missing p256dh', () => {
    const invalidKeys = {
      auth: 'tBHItJI5svbpez7KI4CCXg',
    }

    const result = pushSubscriptionKeysSchema.safeParse(invalidKeys)
    expect(result.success).toBe(false)
  })

  it('should reject missing auth', () => {
    const invalidKeys = {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
    }

    const result = pushSubscriptionKeysSchema.safeParse(invalidKeys)
    expect(result.success).toBe(false)
  })
})

describe('webPushSubscriptionSchema', () => {
  it('should validate valid web push subscription', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
      keys: {
        p256dh:
          'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    }

    const result = webPushSubscriptionSchema.safeParse(validSubscription)
    expect(result.success).toBe(true)
  })

  it('should validate subscription with optional fields', () => {
    const subscriptionWithoutOptional = {}

    const result = webPushSubscriptionSchema.safeParse(subscriptionWithoutOptional)
    expect(result.success).toBe(true)
  })

  it('should validate subscription with only endpoint', () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
    }

    const result = webPushSubscriptionSchema.safeParse(subscription)
    expect(result.success).toBe(true)
  })
})

describe('fcmPushSubscriptionSchema', () => {
  it('should validate valid FCM push subscription', () => {
    const validSubscription = {
      registrationId: 'fcm-registration-id-123',
      registrationType: 'FCM' as const,
    }

    const result = fcmPushSubscriptionSchema.safeParse(validSubscription)
    expect(result.success).toBe(true)
  })

  it('should reject missing registrationId', () => {
    const invalidSubscription = {
      registrationType: 'FCM' as const,
    }

    const result = fcmPushSubscriptionSchema.safeParse(invalidSubscription)
    expect(result.success).toBe(false)
  })

  it('should reject invalid registrationType', () => {
    const invalidSubscription = {
      registrationId: 'fcm-registration-id-123',
      registrationType: 'APNS',
    }

    const result = fcmPushSubscriptionSchema.safeParse(invalidSubscription)
    expect(result.success).toBe(false)
  })
})

describe('apnPushSubscriptionSchema', () => {
  it('should validate valid APN push subscription', () => {
    const validSubscription = {
      registrationId: 'apn-device-token-123',
    }

    const result = apnPushSubscriptionSchema.safeParse(validSubscription)
    expect(result.success).toBe(true)
  })

  it('should reject missing registrationId', () => {
    const invalidSubscription = {}

    const result = apnPushSubscriptionSchema.safeParse(invalidSubscription)
    expect(result.success).toBe(false)
  })
})

describe('pushSubscriptionSchema', () => {
  it('should validate web push subscription', () => {
    const webPush = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
      keys: {
        p256dh: 'test-key',
        auth: 'test-auth',
      },
    }

    const result = pushSubscriptionSchema.safeParse(webPush)
    expect(result.success).toBe(true)
  })

  it('should validate FCM push subscription', () => {
    const fcmPush = {
      registrationId: 'fcm-id',
      registrationType: 'FCM' as const,
    }

    const result = pushSubscriptionSchema.safeParse(fcmPush)
    expect(result.success).toBe(true)
  })

  it('should validate APN push subscription', () => {
    const apnPush = {
      registrationId: 'apn-token',
    }

    const result = pushSubscriptionSchema.safeParse(apnPush)
    expect(result.success).toBe(true)
  })

  it('should validate null value', () => {
    const result = pushSubscriptionSchema.safeParse(null)
    expect(result.success).toBe(true)
  })

  it('should validate undefined value', () => {
    const result = pushSubscriptionSchema.safeParse(undefined)
    expect(result.success).toBe(true)
  })
})

describe('propsSchema', () => {
  it('should validate valid device props', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
      name: 'iPhone 15 Pro',
      pushPlatform: 'apn' as const,
      pushSubscription: {
        registrationId: 'apn-token',
      },
      hasPushSubscription: true,
    }

    const result = propsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal device props', () => {
    const minimalProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
    }

    const result = propsSchema.safeParse(minimalProps)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const invalidProps = {
      id: 'not-a-uuid',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid datetime', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: 'not-a-date',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject missing userId', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid pushPlatform', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
      pushPlatform: 'invalid-platform',
    }

    const result = propsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should accept fcm as pushPlatform', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
      pushPlatform: 'fcm' as const,
    }

    const result = propsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should accept apn as pushPlatform', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
      pushPlatform: 'apn' as const,
    }

    const result = propsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })
})

describe('createPropsSchema', () => {
  it('should validate valid create props', () => {
    const validCreateProps = {
      userId: 'user-123',
      name: 'My Device',
      pushPlatform: 'fcm' as const,
      pushSubscription: {
        registrationId: 'fcm-id',
        registrationType: 'FCM' as const,
      },
      hasPushSubscription: true,
    }

    const result = createPropsSchema.safeParse(validCreateProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal create props', () => {
    const minimalCreateProps = {
      userId: 'user-123',
    }

    const result = createPropsSchema.safeParse(minimalCreateProps)
    expect(result.success).toBe(true)
  })

  it('should reject missing userId', () => {
    const invalidCreateProps = {
      name: 'My Device',
    }

    const result = createPropsSchema.safeParse(invalidCreateProps)
    expect(result.success).toBe(false)
  })

  it('should not include id field', () => {
    // The schema should not have id, createdAt, updatedAt
    const propsWithId = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
    }

    const result = createPropsSchema.safeParse(propsWithId)
    expect(result.success).toBe(true)
    if (result.success) {
      // id should be stripped by the schema
      expect(result.data).not.toHaveProperty('id')
    }
  })
})

describe('updatePropsSchema', () => {
  it('should validate valid update props', () => {
    const validUpdateProps = {
      name: 'Updated Device Name',
      pushPlatform: 'apn' as const,
      hasPushSubscription: false,
    }

    const result = updatePropsSchema.safeParse(validUpdateProps)
    expect(result.success).toBe(true)
  })

  it('should validate empty update props', () => {
    const emptyProps = {}

    const result = updatePropsSchema.safeParse(emptyProps)
    expect(result.success).toBe(true)
  })

  it('should validate partial update props', () => {
    const partialProps = {
      name: 'New Name',
    }

    const result = updatePropsSchema.safeParse(partialProps)
    expect(result.success).toBe(true)
  })

  it('should not include userId field', () => {
    const propsWithUserId = {
      userId: 'user-123',
      name: 'Device',
    }

    const result = updatePropsSchema.safeParse(propsWithUserId)
    expect(result.success).toBe(true)
    if (result.success) {
      // userId should be stripped by the schema
      expect(result.data).not.toHaveProperty('userId')
    }
  })

  it('should reject invalid pushPlatform', () => {
    const invalidProps = {
      pushPlatform: 'invalid',
    }

    const result = updatePropsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })
})

describe('pushPropsSchema', () => {
  it('should validate valid push props', () => {
    const validPushProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      pushPlatform: 'fcm' as const,
      pushSubscription: {
        registrationId: 'fcm-id',
        registrationType: 'FCM' as const,
      },
    }

    const result = pushPropsSchema.safeParse(validPushProps)
    expect(result.success).toBe(true)
  })

  it('should require valid UUID for id', () => {
    const invalidPushProps = {
      id: 'not-a-uuid',
      pushPlatform: 'fcm' as const,
      pushSubscription: null,
    }

    const result = pushPropsSchema.safeParse(invalidPushProps)
    expect(result.success).toBe(false)
  })

  it('should validate push props with null subscription', () => {
    const pushProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      pushPlatform: 'apn' as const,
      pushSubscription: null,
    }

    const result = pushPropsSchema.safeParse(pushProps)
    expect(result.success).toBe(true)
  })

  it('should require id field', () => {
    const propsWithoutId = {
      pushPlatform: 'fcm' as const,
      pushSubscription: null,
    }

    const result = pushPropsSchema.safeParse(propsWithoutId)
    expect(result.success).toBe(false)
  })
})

describe('types', () => {
  it('should export Props type', () => {
    // Type-level test - if this compiles, the type is exported
    const props: types.Props = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
    }
    expect(props.id).toBeDefined()
  })

  it('should export CreateProps type', () => {
    const createProps: types.CreateProps = {
      userId: 'user-123',
    }
    expect(createProps.userId).toBeDefined()
  })

  it('should export UpdateProps type', () => {
    const updateProps: types.UpdateProps = {
      name: 'Updated Name',
    }
    expect(updateProps.name).toBeDefined()
  })

  it('should export PushProps type', () => {
    const pushProps: types.PushProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }
    expect(pushProps.id).toBeDefined()
  })

  it('should export PushSubscription type', () => {
    const pushSubscription: types.PushSubscription = {
      endpoint: 'https://example.com',
      keys: {
        p256dh: 'key',
        auth: 'auth',
      },
    }
    expect(pushSubscription.endpoint).toBeDefined()
  })

  it('should export FCMPushSubscription type', () => {
    const fcmSubscription: types.FCMPushSubscription = {
      registrationId: 'fcm-id',
      registrationType: 'FCM',
    }
    expect(fcmSubscription.registrationId).toBeDefined()
  })

  it('should export APNPushSubscription type', () => {
    const apnSubscription: types.APNPushSubscription = {
      registrationId: 'apn-token',
    }
    expect(apnSubscription.registrationId).toBeDefined()
  })

  it('should export Resource type', () => {
    const testResource: types.Resource = {
      name: 'Test',
      tableName: 'tests',
      schema: propsSchema,
    }
    expect(testResource.name).toBeDefined()
  })
})

describe('resource schema matches propsSchema', () => {
  it('should use the same schema', () => {
    // Verify the resource uses the propsSchema
    expect(resource.schema).toBe(propsSchema)
  })

  it('should validate the same data', () => {
    const testData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: 'user-123',
      name: 'Test Device',
    }

    const propsResult = propsSchema.safeParse(testData)
    const resourceResult = resource.schema.safeParse(testData)

    expect(propsResult.success).toBe(true)
    expect(resourceResult.success).toBe(true)
    if (propsResult.success && resourceResult.success) {
      expect(propsResult.data).toEqual(resourceResult.data)
    }
  })
})
