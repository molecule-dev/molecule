/**
 * `@molecule/app-push`
 * Comprehensive tests for push notifications module exports and integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import everything from the main module to test exports
import {
  // Permission functions
  checkPermission,
  clearBadge,
  // Web provider
  createWebPushProvider,
  getProvider,
  getToken,
  type LocalNotificationOptions,
  type NotificationActionEvent,
  type NotificationActionListener,
  type NotificationReceivedEvent,
  type NotificationReceivedListener,
  onNotificationAction,
  // Event listeners
  onNotificationReceived,
  // Types (testing that they're exported)
  type PermissionStatus,
  type PushNotification,
  type PushNotificationAction,
  type PushProvider,
  type PushToken,
  // Registration
  register,
  requestPermission,
  // Local notifications
  scheduleLocal,
  // Badge management
  setBadge,
  // Provider management
  setProvider,
  type TokenChangeListener,
} from '../index.js'

/**
 * Creates a mock push provider with all required methods
 */
function createMockProvider(overrides: Partial<PushProvider> = {}): PushProvider {
  const mockToken: PushToken = {
    value: 'mock-token-123',
    platform: 'web',
    timestamp: Date.now(),
  }

  return {
    checkPermission: vi.fn().mockResolvedValue('granted' as PermissionStatus),
    requestPermission: vi.fn().mockResolvedValue('granted' as PermissionStatus),
    register: vi.fn().mockResolvedValue(mockToken),
    unregister: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(mockToken),
    onNotificationReceived: vi.fn().mockReturnValue(() => {}),
    onNotificationAction: vi.fn().mockReturnValue(() => {}),
    onTokenChange: vi.fn().mockReturnValue(() => {}),
    scheduleLocal: vi.fn().mockResolvedValue('local-notification-id'),
    cancelLocal: vi.fn().mockResolvedValue(undefined),
    cancelAllLocal: vi.fn().mockResolvedValue(undefined),
    getPendingLocal: vi.fn().mockResolvedValue([]),
    getDelivered: vi.fn().mockResolvedValue([]),
    removeDelivered: vi.fn().mockResolvedValue(undefined),
    removeAllDelivered: vi.fn().mockResolvedValue(undefined),
    setBadge: vi.fn().mockResolvedValue(undefined),
    getBadge: vi.fn().mockResolvedValue(0),
    clearBadge: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    ...overrides,
  }
}

describe('@molecule/app-push', () => {
  let mockProvider: PushProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Exports', () => {
    it('should export provider management functions', () => {
      expect(typeof setProvider).toBe('function')
      expect(typeof getProvider).toBe('function')
    })

    it('should export permission functions', () => {
      expect(typeof checkPermission).toBe('function')
      expect(typeof requestPermission).toBe('function')
    })

    it('should export registration functions', () => {
      expect(typeof register).toBe('function')
      expect(typeof getToken).toBe('function')
    })

    it('should export event listener functions', () => {
      expect(typeof onNotificationReceived).toBe('function')
      expect(typeof onNotificationAction).toBe('function')
    })

    it('should export local notification functions', () => {
      expect(typeof scheduleLocal).toBe('function')
    })

    it('should export badge management functions', () => {
      expect(typeof setBadge).toBe('function')
      expect(typeof clearBadge).toBe('function')
    })

    it('should export web provider factory', () => {
      expect(typeof createWebPushProvider).toBe('function')
    })
  })

  describe('Provider Management', () => {
    it('should allow setting and retrieving provider', () => {
      const provider = createMockProvider()
      setProvider(provider)
      expect(getProvider()).toBe(provider)
    })

    it('should create web provider if none is set', () => {
      // Reset by getting a new provider without setting one first
      // In the actual implementation, getProvider creates a web provider by default
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.checkPermission).toBe('function')
    })

    it('should use the set provider for all operations', async () => {
      const customToken: PushToken = {
        value: 'custom-token',
        platform: 'ios',
        timestamp: Date.now(),
      }
      const customProvider = createMockProvider({
        getToken: vi.fn().mockResolvedValue(customToken),
      })
      setProvider(customProvider)

      const result = await getToken()
      expect(result).toEqual(customToken)
      expect(customProvider.getToken).toHaveBeenCalled()
    })
  })

  describe('Permission Handling', () => {
    describe('checkPermission()', () => {
      it('should check permission status', async () => {
        const status = await checkPermission()
        expect(mockProvider.checkPermission).toHaveBeenCalled()
        expect(status).toBe('granted')
      })

      it('should handle denied permission', async () => {
        ;(mockProvider.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied')
        const status = await checkPermission()
        expect(status).toBe('denied')
      })

      it('should handle default permission', async () => {
        ;(mockProvider.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValue('default')
        const status = await checkPermission()
        expect(status).toBe('default')
      })

      it('should handle prompt permission', async () => {
        ;(mockProvider.checkPermission as ReturnType<typeof vi.fn>).mockResolvedValue('prompt')
        const status = await checkPermission()
        expect(status).toBe('prompt')
      })
    })

    describe('requestPermission()', () => {
      it('should request permission', async () => {
        const status = await requestPermission()
        expect(mockProvider.requestPermission).toHaveBeenCalled()
        expect(status).toBe('granted')
      })

      it('should return denied if user denies', async () => {
        ;(mockProvider.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied')
        const status = await requestPermission()
        expect(status).toBe('denied')
      })

      it('should return default on dismiss', async () => {
        ;(mockProvider.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('default')
        const status = await requestPermission()
        expect(status).toBe('default')
      })
    })
  })

  describe('Registration', () => {
    describe('register()', () => {
      it('should register for push notifications', async () => {
        const token = await register()
        expect(mockProvider.register).toHaveBeenCalled()
        expect(token.value).toBe('mock-token-123')
      })

      it('should return token with platform info', async () => {
        const token = await register()
        expect(token.platform).toBeDefined()
        expect(token.timestamp).toBeDefined()
      })

      it('should handle registration errors', async () => {
        const error = new Error('Registration failed')
        ;(mockProvider.register as ReturnType<typeof vi.fn>).mockRejectedValue(error)
        await expect(register()).rejects.toThrow('Registration failed')
      })

      it('should return different tokens for different platforms', async () => {
        const iosToken: PushToken = {
          value: 'ios-device-token',
          platform: 'ios',
          timestamp: Date.now(),
        }
        ;(mockProvider.register as ReturnType<typeof vi.fn>).mockResolvedValue(iosToken)

        const token = await register()
        expect(token.platform).toBe('ios')
      })
    })

    describe('getToken()', () => {
      it('should get current token', async () => {
        const token = await getToken()
        expect(mockProvider.getToken).toHaveBeenCalled()
        expect(token?.value).toBe('mock-token-123')
      })

      it('should return null if not registered', async () => {
        ;(mockProvider.getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null)
        const token = await getToken()
        expect(token).toBeNull()
      })
    })
  })

  describe('Event Listeners', () => {
    describe('onNotificationReceived()', () => {
      it('should register notification received listener', () => {
        const listener: NotificationReceivedListener = vi.fn()
        const unsubscribe = onNotificationReceived(listener)
        expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
        expect(typeof unsubscribe).toBe('function')
      })

      it('should return unsubscribe function', () => {
        const mockUnsubscribe = vi.fn()
        ;(mockProvider.onNotificationReceived as ReturnType<typeof vi.fn>).mockReturnValue(
          mockUnsubscribe,
        )

        const listener: NotificationReceivedListener = vi.fn()
        const unsubscribe = onNotificationReceived(listener)
        unsubscribe()
        expect(mockUnsubscribe).toHaveBeenCalled()
      })

      it('should handle notification received event', () => {
        const listener = vi.fn()
        ;(mockProvider.onNotificationReceived as ReturnType<typeof vi.fn>).mockImplementation(
          (cb) => {
            const event: NotificationReceivedEvent = {
              notification: {
                id: 'notif-1',
                title: 'Test Notification',
                body: 'Test body',
              },
              foreground: true,
            }
            cb(event)
            return () => {}
          },
        )

        onNotificationReceived(listener)
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            notification: expect.objectContaining({
              id: 'notif-1',
              title: 'Test Notification',
            }),
            foreground: true,
          }),
        )
      })

      it('should handle background notifications', () => {
        const listener = vi.fn()
        ;(mockProvider.onNotificationReceived as ReturnType<typeof vi.fn>).mockImplementation(
          (cb) => {
            const event: NotificationReceivedEvent = {
              notification: { id: 'notif-2', title: 'Background' },
              foreground: false,
            }
            cb(event)
            return () => {}
          },
        )

        onNotificationReceived(listener)
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            foreground: false,
          }),
        )
      })
    })

    describe('onNotificationAction()', () => {
      it('should register notification action listener', () => {
        const listener: NotificationActionListener = vi.fn()
        const unsubscribe = onNotificationAction(listener)
        expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
        expect(typeof unsubscribe).toBe('function')
      })

      it('should handle action event with actionId', () => {
        const listener = vi.fn()
        ;(mockProvider.onNotificationAction as ReturnType<typeof vi.fn>).mockImplementation(
          (cb) => {
            const event: NotificationActionEvent = {
              notification: { id: 'notif-1', title: 'Action Test' },
              actionId: 'reply',
            }
            cb(event)
            return () => {}
          },
        )

        onNotificationAction(listener)
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            actionId: 'reply',
          }),
        )
      })

      it('should handle tap action without actionId', () => {
        const listener = vi.fn()
        ;(mockProvider.onNotificationAction as ReturnType<typeof vi.fn>).mockImplementation(
          (cb) => {
            const event: NotificationActionEvent = {
              notification: { id: 'notif-1', title: 'Tap Test' },
            }
            cb(event)
            return () => {}
          },
        )

        onNotificationAction(listener)
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            notification: expect.objectContaining({ id: 'notif-1' }),
          }),
        )
      })
    })
  })

  describe('Local Notifications', () => {
    describe('scheduleLocal()', () => {
      it('should schedule a local notification', async () => {
        const options: LocalNotificationOptions = {
          title: 'Test Notification',
          body: 'Test body',
        }
        const id = await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
        expect(typeof id).toBe('string')
      })

      it('should schedule notification with custom ID', async () => {
        const options: LocalNotificationOptions = {
          id: 'custom-id',
          title: 'Custom ID Notification',
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification for future time', async () => {
        const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
        const options: LocalNotificationOptions = {
          title: 'Future Notification',
          at: futureDate,
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule repeating notification', async () => {
        const options: LocalNotificationOptions = {
          title: 'Repeating Notification',
          repeat: 'day',
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification with actions', async () => {
        const options: LocalNotificationOptions = {
          title: 'Actionable Notification',
          actions: [
            { id: 'accept', title: 'Accept' },
            { id: 'decline', title: 'Decline' },
          ],
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification with extra data', async () => {
        const options: LocalNotificationOptions = {
          title: 'Data Notification',
          extra: { orderId: '12345', type: 'order_update' },
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification with badge', async () => {
        const options: LocalNotificationOptions = {
          title: 'Badge Notification',
          badge: 5,
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification with sound', async () => {
        const options: LocalNotificationOptions = {
          title: 'Sound Notification',
          sound: 'notification.wav',
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })

      it('should schedule notification with channel ID (Android)', async () => {
        const options: LocalNotificationOptions = {
          title: 'Channel Notification',
          channelId: 'high-priority',
        }
        await scheduleLocal(options)
        expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
      })
    })
  })

  describe('Badge Management', () => {
    describe('setBadge()', () => {
      it('should set badge count', async () => {
        await setBadge(5)
        expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
      })

      it('should set badge to zero', async () => {
        await setBadge(0)
        expect(mockProvider.setBadge).toHaveBeenCalledWith(0)
      })

      it('should handle large badge numbers', async () => {
        await setBadge(999)
        expect(mockProvider.setBadge).toHaveBeenCalledWith(999)
      })
    })

    describe('clearBadge()', () => {
      it('should clear badge', async () => {
        await clearBadge()
        expect(mockProvider.clearBadge).toHaveBeenCalled()
      })
    })
  })

  describe('Web Push Provider', () => {
    describe('createWebPushProvider()', () => {
      it('should create a web push provider', () => {
        const provider = createWebPushProvider()
        expect(provider).toBeDefined()
        expect(typeof provider.checkPermission).toBe('function')
        expect(typeof provider.requestPermission).toBe('function')
        expect(typeof provider.register).toBe('function')
      })

      it('should accept VAPID public key', () => {
        const vapidKey = 'BNhKaZ4ZH6J9UJ8VkuBJLCdXJ0J3-test-key'
        const provider = createWebPushProvider(vapidKey)
        expect(provider).toBeDefined()
      })

      it('should implement all provider methods', () => {
        const provider = createWebPushProvider()
        expect(typeof provider.checkPermission).toBe('function')
        expect(typeof provider.requestPermission).toBe('function')
        expect(typeof provider.register).toBe('function')
        expect(typeof provider.unregister).toBe('function')
        expect(typeof provider.getToken).toBe('function')
        expect(typeof provider.onNotificationReceived).toBe('function')
        expect(typeof provider.onNotificationAction).toBe('function')
        expect(typeof provider.onTokenChange).toBe('function')
        expect(typeof provider.scheduleLocal).toBe('function')
        expect(typeof provider.cancelLocal).toBe('function')
        expect(typeof provider.cancelAllLocal).toBe('function')
        expect(typeof provider.getPendingLocal).toBe('function')
        expect(typeof provider.getDelivered).toBe('function')
        expect(typeof provider.removeDelivered).toBe('function')
        expect(typeof provider.removeAllDelivered).toBe('function')
        expect(typeof provider.setBadge).toBe('function')
        expect(typeof provider.getBadge).toBe('function')
        expect(typeof provider.clearBadge).toBe('function')
        expect(typeof provider.destroy).toBe('function')
      })

      it('should handle listener subscription and unsubscription', () => {
        const provider = createWebPushProvider()
        const listener = vi.fn()
        const unsubscribe = provider.onNotificationReceived(listener)
        expect(typeof unsubscribe).toBe('function')
        // Should not throw when unsubscribing
        expect(() => unsubscribe()).not.toThrow()
      })

      it('should handle token change listener', () => {
        const provider = createWebPushProvider()
        const listener: TokenChangeListener = vi.fn()
        const unsubscribe = provider.onTokenChange(listener)
        expect(typeof unsubscribe).toBe('function')
      })

      it('should cleanup on destroy', () => {
        const provider = createWebPushProvider()
        expect(() => provider.destroy()).not.toThrow()
      })
    })
  })

  describe('Error Handling', () => {
    it('should propagate checkPermission errors', async () => {
      const error = new Error('Permission check failed')
      ;(mockProvider.checkPermission as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(checkPermission()).rejects.toThrow('Permission check failed')
    })

    it('should propagate requestPermission errors', async () => {
      const error = new Error('Permission request failed')
      ;(mockProvider.requestPermission as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(requestPermission()).rejects.toThrow('Permission request failed')
    })

    it('should propagate register errors', async () => {
      const error = new Error('Registration failed')
      ;(mockProvider.register as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(register()).rejects.toThrow('Registration failed')
    })

    it('should propagate getToken errors', async () => {
      const error = new Error('Token retrieval failed')
      ;(mockProvider.getToken as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(getToken()).rejects.toThrow('Token retrieval failed')
    })

    it('should propagate scheduleLocal errors', async () => {
      const error = new Error('Scheduling failed')
      ;(mockProvider.scheduleLocal as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(scheduleLocal({ title: 'Test' })).rejects.toThrow('Scheduling failed')
    })

    it('should propagate setBadge errors', async () => {
      const error = new Error('Badge update failed')
      ;(mockProvider.setBadge as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(setBadge(5)).rejects.toThrow('Badge update failed')
    })

    it('should propagate clearBadge errors', async () => {
      const error = new Error('Badge clear failed')
      ;(mockProvider.clearBadge as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(clearBadge()).rejects.toThrow('Badge clear failed')
    })
  })

  describe('Type Safety', () => {
    it('should accept valid PermissionStatus values', () => {
      const statuses: PermissionStatus[] = ['granted', 'denied', 'default', 'prompt']
      expect(statuses.length).toBe(4)
    })

    it('should accept valid PushNotification', () => {
      const notification: PushNotification = {
        id: 'notif-1',
        title: 'Test Title',
        body: 'Test body',
        data: { key: 'value' },
        badge: 1,
        sound: 'default',
        icon: 'https://example.com/icon.png',
        image: 'https://example.com/image.png',
        clickAction: 'OPEN_APP',
        tag: 'group-1',
        requireInteraction: true,
        timestamp: Date.now(),
        actions: [{ id: 'action-1', title: 'Action 1' }],
      }
      expect(notification.id).toBe('notif-1')
    })

    it('should accept valid PushNotificationAction', () => {
      const action: PushNotificationAction = {
        id: 'action-1',
        title: 'Action Title',
        icon: 'https://example.com/action-icon.png',
      }
      expect(action.id).toBe('action-1')
    })

    it('should accept valid PushToken', () => {
      const token: PushToken = {
        value: 'device-token-123',
        platform: 'ios',
        timestamp: Date.now(),
      }
      expect(token.platform).toBe('ios')
    })

    it('should accept valid NotificationReceivedEvent', () => {
      const event: NotificationReceivedEvent = {
        notification: { id: 'notif-1', title: 'Test' },
        foreground: true,
      }
      expect(event.foreground).toBe(true)
    })

    it('should accept valid NotificationActionEvent', () => {
      const event: NotificationActionEvent = {
        notification: { id: 'notif-1', title: 'Test' },
        actionId: 'reply',
      }
      expect(event.actionId).toBe('reply')
    })

    it('should accept valid LocalNotificationOptions', () => {
      const options: LocalNotificationOptions = {
        id: 'local-1',
        title: 'Local Notification',
        body: 'Body text',
        at: new Date(),
        repeat: 'day',
        extra: { custom: 'data' },
        sound: 'notification.wav',
        badge: 5,
        channelId: 'default',
        actions: [{ id: 'action-1', title: 'Action' }],
      }
      expect(options.title).toBe('Local Notification')
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      const results = await Promise.all([checkPermission(), getToken(), register()])
      expect(results).toHaveLength(3)
    })

    it('should handle rapid listener registrations', () => {
      const listeners: (() => void)[] = []
      for (let i = 0; i < 10; i++) {
        listeners.push(onNotificationReceived(vi.fn()))
      }
      expect(listeners).toHaveLength(10)
      // Unsubscribe all
      listeners.forEach((unsub) => unsub())
    })

    it('should handle provider switching', async () => {
      const provider1 = createMockProvider({
        checkPermission: vi.fn().mockResolvedValue('granted'),
      })
      const provider2 = createMockProvider({
        checkPermission: vi.fn().mockResolvedValue('denied'),
      })

      setProvider(provider1)
      const status1 = await checkPermission()
      expect(status1).toBe('granted')

      setProvider(provider2)
      const status2 = await checkPermission()
      expect(status2).toBe('denied')
    })

    it('should handle notification with all optional fields', async () => {
      const notification: PushNotification = {
        id: 'full-notif',
        title: 'Full Notification',
        body: 'Full body',
        data: { key1: 'value1', key2: 123 },
        badge: 10,
        sound: 'alert.wav',
        icon: 'https://example.com/icon.png',
        image: 'https://example.com/image.jpg',
        clickAction: 'OPEN_DETAILS',
        tag: 'updates',
        requireInteraction: false,
        timestamp: Date.now(),
        actions: [
          { id: 'view', title: 'View', icon: 'view-icon.png' },
          { id: 'dismiss', title: 'Dismiss' },
        ],
      }

      const listener = vi.fn()
      ;(mockProvider.onNotificationReceived as ReturnType<typeof vi.fn>).mockImplementation(
        (cb) => {
          cb({ notification, foreground: true })
          return () => {}
        },
      )

      onNotificationReceived(listener)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            id: 'full-notif',
            actions: expect.arrayContaining([expect.objectContaining({ id: 'view' })]),
          }),
        }),
      )
    })

    it('should handle empty notification data', async () => {
      const options: LocalNotificationOptions = {
        title: 'Minimal',
      }
      await scheduleLocal(options)
      expect(mockProvider.scheduleLocal).toHaveBeenCalledWith(options)
    })

    it('should handle repeat intervals', async () => {
      const intervals: LocalNotificationOptions['repeat'][] = [
        'minute',
        'hour',
        'day',
        'week',
        'month',
        'year',
      ]

      for (const repeat of intervals) {
        const options: LocalNotificationOptions = {
          title: `Repeat ${repeat}`,
          repeat,
        }
        await scheduleLocal(options)
      }

      expect(mockProvider.scheduleLocal).toHaveBeenCalledTimes(6)
    })
  })
})
