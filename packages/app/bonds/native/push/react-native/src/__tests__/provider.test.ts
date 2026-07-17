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
  mockUnregisterForNotificationsAsync,
  mockSetNotificationHandler,
  mockAddNotificationReceivedListener,
  mockAddNotificationResponseReceivedListener,
  mockAddPushTokenListener,
  mockSetNotificationChannelAsync,
  mockScheduleNotificationAsync,
  mockCancelScheduledNotificationAsync,
  mockCancelAllScheduledNotificationsAsync,
  mockGetAllScheduledNotificationsAsync,
  mockGetPresentedNotificationsAsync,
  mockDismissNotificationAsync,
  mockDismissAllNotificationsAsync,
  mockSetBadgeCountAsync,
  mockGetBadgeCountAsync,
  mockPlatform,
} = vi.hoisted(() => ({
  mockGetPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  mockRequestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  mockGetExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: 'ExponentPushToken[xxx]' }),
  mockUnregisterForNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  mockSetNotificationHandler: vi.fn(),
  mockAddNotificationReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockAddNotificationResponseReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockAddPushTokenListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  mockSetNotificationChannelAsync: vi.fn().mockResolvedValue({ id: 'channel' }),
  mockScheduleNotificationAsync: vi.fn().mockResolvedValue('notif-id-1'),
  mockCancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  mockCancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  mockGetAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  mockGetPresentedNotificationsAsync: vi.fn().mockResolvedValue([]),
  mockDismissNotificationAsync: vi.fn().mockResolvedValue(undefined),
  mockDismissAllNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  mockSetBadgeCountAsync: vi.fn().mockResolvedValue(true),
  mockGetBadgeCountAsync: vi.fn().mockResolvedValue(0),
  mockPlatform: { OS: 'ios' as 'ios' | 'android' | 'web' },
}))

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  unregisterForNotificationsAsync: mockUnregisterForNotificationsAsync,
  setNotificationHandler: mockSetNotificationHandler,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  addPushTokenListener: mockAddPushTokenListener,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  AndroidImportance: { UNKNOWN: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 },
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

// The provider reads the EAS projectId from the Expo config via expo-constants
// when no explicit `projectId` option is supplied.
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { eas: { projectId: 'app-json-project-id' } } } },
}))

vi.mock('react-native', () => ({
  Platform: mockPlatform,
}))

vi.mock('@molecule/app-push', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativePushProvider, provider } from '../provider.js'

describe('@molecule/app-push-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default every test to iOS; Android-specific tests opt in explicitly.
    mockPlatform.OS = 'ios'
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

      it('passes an explicit projectId option to getExpoPushTokenAsync', async () => {
        const withProject = createReactNativePushProvider({ projectId: 'cfg-project-id' })
        await withProject.register()
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'cfg-project-id' })
      })

      it('falls back to the Expo config projectId (app.json extra.eas.projectId) when no option is set', async () => {
        await p.register()
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'app-json-project-id' })
      })
    })

    describe('unregister', () => {
      it('should clear the current token', async () => {
        await p.register()
        await p.unregister()
        const token = await p.getToken()
        expect(token).toBeNull()
      })

      it('actually deregisters the device (not just the local cache)', async () => {
        await p.register()
        await p.unregister()
        expect(mockUnregisterForNotificationsAsync).toHaveBeenCalled()
        expect(await p.getToken()).toBeNull()
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

      it('re-fetches the Expo token on a native device-token change and never clobbers with the native token', async () => {
        // Establish an Expo token via register first.
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[registered]' })
        await p.register()
        expect((await p.getToken())!.value).toBe('ExponentPushToken[registered]')

        // A native device-token roll arrives; the next Expo fetch returns a new token.
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[refreshed]' })
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

        capturedCallback!({ data: 'native-device-token-xyz' })

        await vi.waitFor(() => {
          expect(listener).toHaveBeenCalled()
        })

        // The listener receives the freshly re-fetched EXPO token, NOT the raw native token.
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ value: 'ExponentPushToken[refreshed]' }),
        )
        const delivered = listener.mock.calls[0][0]
        expect(delivered.value).not.toBe('native-device-token-xyz')

        // getToken() still returns an Expo token — the native device token never overwrites it.
        const cached = await p.getToken()
        expect(cached!.value).toBe('ExponentPushToken[refreshed]')
        expect(cached!.value).not.toBe('native-device-token-xyz')
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

    describe('Android notification channel', () => {
      it('creates the configured channel on register (Android)', async () => {
        mockPlatform.OS = 'android'
        const androidProvider = createReactNativePushProvider({
          androidChannelId: 'chat-messages',
          androidChannelName: 'Chat Messages',
        })
        await androidProvider.register()
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('chat-messages', {
          name: 'Chat Messages',
          importance: 3,
        })
      })

      it('does NOT create a channel on iOS', async () => {
        mockPlatform.OS = 'ios'
        const iosProvider = createReactNativePushProvider({
          androidChannelId: 'chat-messages',
          androidChannelName: 'Chat Messages',
        })
        await iosProvider.register()
        expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled()
      })

      it('falls back to the channel id as the display name when androidChannelName is omitted', async () => {
        mockPlatform.OS = 'android'
        const androidProvider = createReactNativePushProvider({ androidChannelId: 'alerts' })
        await androidProvider.register()
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('alerts', {
          name: 'alerts',
          importance: 3,
        })
      })

      it('does not create a channel when no androidChannelId is configured (Android)', async () => {
        mockPlatform.OS = 'android'
        const androidProvider = createReactNativePushProvider()
        await androidProvider.register()
        expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled()
      })

      it('creates the channel only once across multiple register calls', async () => {
        mockPlatform.OS = 'android'
        const androidProvider = createReactNativePushProvider({ androidChannelId: 'once' })
        await androidProvider.register()
        await androidProvider.register()
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledTimes(1)
      })

      it('targets the configured channel when scheduling a local notification (Android)', async () => {
        mockPlatform.OS = 'android'
        const androidProvider = createReactNativePushProvider({ androidChannelId: 'reminders' })
        await androidProvider.scheduleLocal({ title: 'Hi' })
        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({ title: 'Hi' }),
          trigger: { channelId: 'reminders' },
        })
      })

      it('prefers the per-call channelId and keeps the date trigger (Android)', async () => {
        mockPlatform.OS = 'android'
        const when = new Date('2026-05-01T00:00:00Z')
        const androidProvider = createReactNativePushProvider({ androidChannelId: 'default-ch' })
        await androidProvider.scheduleLocal({ title: 'Later', at: when, channelId: 'urgent' })
        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({ title: 'Later' }),
          trigger: { date: when, channelId: 'urgent' },
        })
      })

      it('does not attach a channel to the trigger on iOS', async () => {
        mockPlatform.OS = 'ios'
        const iosProvider = createReactNativePushProvider({ androidChannelId: 'ignored' })
        await iosProvider.scheduleLocal({ title: 'Hi', channelId: 'also-ignored' })
        expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({ title: 'Hi' }),
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
