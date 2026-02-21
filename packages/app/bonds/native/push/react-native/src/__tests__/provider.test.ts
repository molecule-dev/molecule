/**
 * Tests for React Native push notifications provider.
 *
 * @module
 */

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

vi.mock('@molecule/app-logger', () => ({
  getLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

const {
  mockGetPermissionsAsync,
  mockRequestPermissionsAsync,
  mockGetExpoPushTokenAsync,
  mockSetNotificationHandler,
  mockAddNotificationReceivedListener,
  mockAddNotificationResponseReceivedListener,
  mockAddPushTokenListener,
  mockScheduleNotificationAsync,
  mockCancelScheduledNotificationAsync,
  mockCancelAllScheduledNotificationsAsync,
  mockGetAllScheduledNotificationsAsync,
  mockGetPresentedNotificationsAsync,
  mockDismissNotificationAsync,
  mockDismissAllNotificationsAsync,
  mockSetBadgeCountAsync,
  mockGetBadgeCountAsync,
} = vi.hoisted(() => ({
  mockGetPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  mockRequestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  mockGetExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: 'ExponentPushToken[xxx]' }),
  mockSetNotificationHandler: vi.fn(),
  mockAddNotificationReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockAddNotificationResponseReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockAddPushTokenListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockScheduleNotificationAsync: vi.fn().mockResolvedValue('notif-id-1'),
  mockCancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  mockCancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  mockGetAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  mockGetPresentedNotificationsAsync: vi.fn().mockResolvedValue([]),
  mockDismissNotificationAsync: vi.fn().mockResolvedValue(undefined),
  mockDismissAllNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  mockSetBadgeCountAsync: vi.fn().mockResolvedValue(true),
  mockGetBadgeCountAsync: vi.fn().mockResolvedValue(0),
}))

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationHandler: mockSetNotificationHandler,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  addPushTokenListener: mockAddPushTokenListener,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
  dismissNotificationAsync: mockDismissNotificationAsync,
  dismissAllNotificationsAsync: mockDismissAllNotificationsAsync,
  setBadgeCountAsync: mockSetBadgeCountAsync,
  getBadgeCountAsync: mockGetBadgeCountAsync,
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

vi.mock('@molecule/app-push', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativePushProvider, provider } from '../provider.js'

describe('@molecule/app-push-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // NOTE: Do not use vi.restoreAllMocks() here — it resets vi.fn() implementations
    // from vi.hoisted(), breaking mock modules for subsequent tests.
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.checkPermission).toBeTypeOf('function')
      expect(provider.requestPermission).toBeTypeOf('function')
      expect(provider.register).toBeTypeOf('function')
      expect(provider.unregister).toBeTypeOf('function')
      expect(provider.getToken).toBeTypeOf('function')
      expect(provider.onNotificationReceived).toBeTypeOf('function')
      expect(provider.onNotificationAction).toBeTypeOf('function')
      expect(provider.onTokenChange).toBeTypeOf('function')
      expect(provider.scheduleLocal).toBeTypeOf('function')
      expect(provider.cancelLocal).toBeTypeOf('function')
      expect(provider.cancelAllLocal).toBeTypeOf('function')
      expect(provider.getPendingLocal).toBeTypeOf('function')
      expect(provider.getDelivered).toBeTypeOf('function')
      expect(provider.removeDelivered).toBeTypeOf('function')
      expect(provider.removeAllDelivered).toBeTypeOf('function')
      expect(provider.setBadge).toBeTypeOf('function')
      expect(provider.getBadge).toBeTypeOf('function')
      expect(provider.clearBadge).toBeTypeOf('function')
      expect(provider.destroy).toBeTypeOf('function')
    })
  })

  describe('createReactNativePushProvider', () => {
    let p: ReturnType<typeof createReactNativePushProvider>

    beforeEach(() => {
      p = createReactNativePushProvider()
    })

    describe('checkPermission', () => {
      it('should return granted when permission is granted', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
        const status = await p.checkPermission()
        expect(status).toBe('granted')
      })

      it('should return denied when permission is denied', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
        const status = await p.checkPermission()
        expect(status).toBe('denied')
      })

      it('should return default for undetermined status', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
        const status = await p.checkPermission()
        expect(status).toBe('default')
      })

      it('should return default for unknown status values', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'something-else' })
        const status = await p.checkPermission()
        expect(status).toBe('default')
      })
    })

    describe('requestPermission', () => {
      it('should request permissions and return status', async () => {
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' })
        const status = await p.requestPermission()
        expect(status).toBe('granted')
        expect(mockRequestPermissionsAsync).toHaveBeenCalled()
      })
    })

    describe('register', () => {
      it('should register for push notifications and return token', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc123]' })
        const token = await p.register()
        expect(token.value).toBe('ExponentPushToken[abc123]')
        expect(token.timestamp).toBeTypeOf('number')
      })
    })

    describe('unregister', () => {
      it('should clear the current token', async () => {
        await p.register()
        await p.unregister()
        const token = await p.getToken()
        expect(token).toBeNull()
      })
    })

    describe('getToken', () => {
      it('should return null when not registered', async () => {
        const token = await p.getToken()
        expect(token).toBeNull()
      })

      it('should return token after registration', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test-token]' })
        await p.register()
        const token = await p.getToken()
        expect(token).not.toBeNull()
        expect(token!.value).toBe('ExponentPushToken[test-token]')
      })
    })

    describe('onNotificationReceived', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onNotificationReceived(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should set notification handler when handleForeground is true', async () => {
        const foregroundProvider = createReactNativePushProvider({ handleForeground: true })
        foregroundProvider.onNotificationReceived(vi.fn())

        await vi.waitFor(() => {
          expect(mockSetNotificationHandler).toHaveBeenCalled()
        })
      })

      it('should not set notification handler when handleForeground is false', async () => {
        const noForegroundProvider = createReactNativePushProvider({ handleForeground: false })
        noForegroundProvider.onNotificationReceived(vi.fn())

        await vi.waitFor(() => {
          expect(mockAddNotificationReceivedListener).toHaveBeenCalled()
        })

        expect(mockSetNotificationHandler).not.toHaveBeenCalled()
      })

      it('should call listener with mapped notification data', async () => {
        let capturedCallback: ((notification: Record<string, unknown>) => void) | undefined
        mockAddNotificationReceivedListener.mockImplementation(
          (callback: (notification: Record<string, unknown>) => void) => {
            capturedCallback = callback
            return { remove: vi.fn() }
          },
        )

        const listener = vi.fn()
        p.onNotificationReceived(listener)

        await vi.waitFor(() => {
          expect(capturedCallback).toBeDefined()
        })

        capturedCallback!({
          request: {
            identifier: 'notif-1',
            content: {
              title: 'Hello',
              body: 'World',
              data: { key: 'value' },
              badge: 5,
              sound: 'default',
            },
          },
        })

        expect(listener).toHaveBeenCalledWith({
          notification: {
            id: 'notif-1',
            title: 'Hello',
            body: 'World',
            data: { key: 'value' },
            badge: 5,
            sound: 'default',
          },
          foreground: true,
        })
      })
    })

    describe('onNotificationAction', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onNotificationAction(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should call listener with mapped action data', async () => {
        let capturedCallback: ((response: Record<string, unknown>) => void) | undefined
        mockAddNotificationResponseReceivedListener.mockImplementation(
          (callback: (response: Record<string, unknown>) => void) => {
            capturedCallback = callback
            return { remove: vi.fn() }
          },
        )

        const listener = vi.fn()
        p.onNotificationAction(listener)

        await vi.waitFor(() => {
          expect(capturedCallback).toBeDefined()
        })

        capturedCallback!({
          notification: {
            request: {
              identifier: 'notif-2',
              content: {
                title: 'Action',
                body: 'Tap me',
                data: {},
                badge: null,
                sound: null,
              },
            },
          },
          actionIdentifier: 'tap',
        })

        expect(listener).toHaveBeenCalledWith({
          notification: {
            id: 'notif-2',
            title: 'Action',
            body: 'Tap me',
            data: {},
          },
          actionId: 'tap',
        })
      })
    })

    describe('onTokenChange', () => {
      it('should register listener and return cleanup', () => {
        const listener = vi.fn()
        const cleanup = p.onTokenChange(listener)
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should call listener with new token', async () => {
        let capturedCallback: ((tokenData: { data: string }) => void) | undefined
        mockAddPushTokenListener.mockImplementation(
          (callback: (tokenData: { data: string }) => void) => {
            capturedCallback = callback
            return { remove: vi.fn() }
          },
        )

        const listener = vi.fn()
        p.onTokenChange(listener)

        await vi.waitFor(() => {
          expect(capturedCallback).toBeDefined()
        })

        capturedCallback!({ data: 'new-token-value' })

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'new-token-value',
          }),
        )
      })
    })

    describe('scheduleLocal', () => {
      it('should schedule notification with immediate trigger', async () => {
        const id = await p.scheduleLocal({ title: 'Test' })
        expect(id).toBe('notif-id-1')
        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: {
            title: 'Test',
            body: undefined,
            data: undefined,
            sound: undefined,
            badge: undefined,
          },
          trigger: null,
        })
      })

      it('should schedule notification with date trigger', async () => {
        const futureDate = new Date('2026-03-01T12:00:00Z')
        const id = await p.scheduleLocal({ title: 'Reminder', at: futureDate })
        expect(id).toBe('notif-id-1')
        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({ title: 'Reminder' }),
          trigger: { date: futureDate },
        })
      })

      it('should include optional fields', async () => {
        await p.scheduleLocal({
          title: 'Full',
          body: 'Full body',
          extra: { key: 'val' },
          sound: true,
          badge: 3,
        })

        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: {
            title: 'Full',
            body: 'Full body',
            data: { key: 'val' },
            sound: true,
            badge: 3,
          },
          trigger: null,
        })
      })
    })

    describe('cancelLocal', () => {
      it('should cancel a scheduled notification by id', async () => {
        await p.cancelLocal('notif-1')
        expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1')
      })
    })

    describe('cancelAllLocal', () => {
      it('should cancel all scheduled notifications', async () => {
        await p.cancelAllLocal()
        expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled()
      })
    })

    describe('getPendingLocal', () => {
      it('should return mapped pending notifications', async () => {
        mockGetAllScheduledNotificationsAsync.mockResolvedValue([
          {
            identifier: 'pending-1',
            content: { title: 'Pending', body: 'Soon', data: { x: 1 }, badge: null, sound: null },
          },
        ])

        const pending = await p.getPendingLocal()
        expect(pending).toEqual([
          {
            id: 'pending-1',
            title: 'Pending',
            body: 'Soon',
            extra: { x: 1 },
          },
        ])
      })

      it('should return empty array when no pending notifications', async () => {
        mockGetAllScheduledNotificationsAsync.mockResolvedValue([])
        const pending = await p.getPendingLocal()
        expect(pending).toEqual([])
      })
    })

    describe('getDelivered', () => {
      it('should return mapped delivered notifications', async () => {
        mockGetPresentedNotificationsAsync.mockResolvedValue([
          {
            request: {
              identifier: 'del-1',
              content: { title: 'Delivered', body: 'Done', data: {}, badge: null, sound: null },
            },
          },
        ])

        const delivered = await p.getDelivered()
        expect(delivered).toEqual([
          {
            id: 'del-1',
            title: 'Delivered',
            body: 'Done',
            data: {},
          },
        ])
      })
    })

    describe('removeDelivered', () => {
      it('should dismiss notifications by ids', async () => {
        await p.removeDelivered(['id-1', 'id-2'])
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith('id-1')
        expect(mockDismissNotificationAsync).toHaveBeenCalledWith('id-2')
      })
    })

    describe('removeAllDelivered', () => {
      it('should dismiss all notifications', async () => {
        await p.removeAllDelivered()
        expect(mockDismissAllNotificationsAsync).toHaveBeenCalled()
      })
    })

    describe('setBadge', () => {
      it('should set badge count', async () => {
        await p.setBadge(5)
        expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5)
      })
    })

    describe('getBadge', () => {
      it('should return badge count', async () => {
        mockGetBadgeCountAsync.mockResolvedValue(3)
        const count = await p.getBadge()
        expect(count).toBe(3)
      })
    })

    describe('clearBadge', () => {
      it('should set badge to 0', async () => {
        await p.clearBadge()
        expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0)
      })
    })

    describe('destroy', () => {
      it('should remove subscriptions on destroy', async () => {
        const removeMock = vi.fn()
        mockAddNotificationReceivedListener.mockReturnValue({ remove: removeMock })

        const freshProvider = createReactNativePushProvider()
        freshProvider.onNotificationReceived(vi.fn())

        // Wait for async import().then() to complete and register the listener
        await vi.waitFor(() => {
          expect(mockAddNotificationReceivedListener).toHaveBeenCalled()
        })

        freshProvider.destroy()
        expect(removeMock).toHaveBeenCalled()
      })
    })
  })
})
