/**
 * Tests for auto-tracking analytics.
 *
 * @module
 */

const { mockTrack, mockIdentify, mockPage, mockReset } = vi.hoisted(() => ({
  mockTrack: vi.fn().mockResolvedValue(undefined),
  mockIdentify: vi.fn().mockResolvedValue(undefined),
  mockPage: vi.fn().mockResolvedValue(undefined),
  mockReset: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@molecule/app-bond', () => ({
  bond: vi.fn(),
  get: vi.fn(() => ({
    identify: mockIdentify,
    track: mockTrack,
    page: mockPage,
    reset: mockReset,
    flush: vi.fn().mockResolvedValue(undefined),
  })),
  isBonded: vi.fn(() => true),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupAutoTracking } from '../auto-tracking.js'
import { setProvider } from '../provider.js'

// Register a mock provider so getProvider() returns our mock
beforeEach(() => {
  vi.clearAllMocks()
  setProvider({
    identify: mockIdentify,
    track: mockTrack,
    page: mockPage,
    reset: mockReset,
    flush: vi.fn().mockResolvedValue(undefined),
  })
})

// ============================================================================
// Web auto-tracking
// ============================================================================

describe('auth tracking', () => {
  it('should track auth.login and identify user', () => {
    const addEventListener = vi.fn()
    setupAutoTracking({ authClient: { addEventListener } })

    const listener = addEventListener.mock.calls[0][0]
    listener({ type: 'login', user: { id: 'u1', email: 'a@b.com', name: 'A' } })

    expect(mockIdentify).toHaveBeenCalledWith({
      userId: 'u1',
      email: 'a@b.com',
      name: 'A',
    })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.login',
      properties: { userId: 'u1' },
    })
  })

  it('should track auth.register and identify user', () => {
    const addEventListener = vi.fn()
    setupAutoTracking({ authClient: { addEventListener } })

    const listener = addEventListener.mock.calls[0][0]
    listener({ type: 'register', user: { id: 'u2' } })

    expect(mockIdentify).toHaveBeenCalledWith({
      userId: 'u2',
      email: undefined,
      name: undefined,
    })
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.register',
      properties: { userId: 'u2' },
    })
  })

  it('should track auth.logout and reset', () => {
    const addEventListener = vi.fn()
    setupAutoTracking({ authClient: { addEventListener } })

    const listener = addEventListener.mock.calls[0][0]
    listener({ type: 'logout' })

    expect(mockTrack).toHaveBeenCalledWith({ name: 'auth.logout' })
    expect(mockReset).toHaveBeenCalled()
  })

  it('should track auth.error', () => {
    const addEventListener = vi.fn()
    setupAutoTracking({ authClient: { addEventListener } })

    const listener = addEventListener.mock.calls[0][0]
    listener({ type: 'error', error: 'Invalid credentials' })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'auth.error',
      properties: { error: 'Invalid credentials' },
    })
  })

  it('should not identify on login without user', () => {
    const addEventListener = vi.fn()
    setupAutoTracking({ authClient: { addEventListener } })

    const listener = addEventListener.mock.calls[0][0]
    listener({ type: 'login' })

    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('should return cleanup that unsubscribes', () => {
    const unsubscribe = vi.fn()
    const addEventListener = vi.fn(() => unsubscribe)
    const cleanup = setupAutoTracking({ authClient: { addEventListener } })

    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('route tracking', () => {
  it('should track page views on route changes', () => {
    const subscribe = vi.fn()
    setupAutoTracking({ router: { subscribe } })

    const listener = subscribe.mock.calls[0][0]
    listener({ pathname: '/settings', search: '?tab=profile', hash: '#section' }, 'PUSH')

    expect(mockPage).toHaveBeenCalledWith({
      path: '/settings',
      url: '/settings?tab=profile#section',
    })
  })

  it('should return cleanup that unsubscribes', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const cleanup = setupAutoTracking({ router: { subscribe } })

    cleanup()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('HTTP error tracking', () => {
  it('should track HTTP errors', () => {
    const addErrorInterceptor = vi.fn()
    setupAutoTracking({ httpClient: { addErrorInterceptor } })

    const interceptor = addErrorInterceptor.mock.calls[0][0]
    const error = {
      message: 'Not Found',
      status: 404,
      config: { method: 'GET', url: '/api/users' },
    }
    const returned = interceptor(error)

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'http.error',
      properties: {
        status: 404,
        method: 'GET',
        url: '/api/users',
        message: 'Not Found',
      },
    })
    expect(returned).toBe(error)
  })

  it('should handle errors without config', () => {
    const addErrorInterceptor = vi.fn()
    setupAutoTracking({ httpClient: { addErrorInterceptor } })

    const interceptor = addErrorInterceptor.mock.calls[0][0]
    interceptor({ message: 'Timeout', status: 0 })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'http.error',
      properties: {
        status: 0,
        method: undefined,
        url: undefined,
        message: 'Timeout',
      },
    })
  })
})

// ============================================================================
// Mobile auto-tracking
// ============================================================================

describe('app lifecycle tracking', () => {
  it('should track app.foreground when entering active state', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onAppStateChange.mock.calls[0][0]
    listener({ current: 'active', previous: 'background' })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'app.foreground',
      properties: { previous: 'background' },
    })
  })

  it('should track app.foreground from inactive state', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onAppStateChange.mock.calls[0][0]
    listener({ current: 'active', previous: 'inactive' })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'app.foreground',
      properties: { previous: 'inactive' },
    })
  })

  it('should track app.background when entering background state', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onAppStateChange.mock.calls[0][0]
    listener({ current: 'background', previous: 'active' })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'app.background',
      properties: { previous: 'active' },
    })
  })

  it('should not track when state does not change meaningfully', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onAppStateChange.mock.calls[0][0]

    // active -> active (no change)
    listener({ current: 'active', previous: 'active' })
    expect(mockTrack).not.toHaveBeenCalled()

    // inactive -> background (not a foreground/background event)
    listener({ current: 'inactive', previous: 'active' })
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('should return cleanup that unsubscribes both listeners', () => {
    const unsubAppState = vi.fn()
    const unsubUrl = vi.fn()
    const onAppStateChange = vi.fn(() => unsubAppState)
    const onUrlOpen = vi.fn(() => unsubUrl)
    const cleanup = setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    cleanup()
    expect(unsubAppState).toHaveBeenCalled()
    expect(unsubUrl).toHaveBeenCalled()
  })
})

describe('deep link tracking', () => {
  it('should track deeplink.open when URL is opened', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onUrlOpen.mock.calls[0][0]
    listener('myapp://products/123')

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'deeplink.open',
      properties: { url: 'myapp://products/123' },
    })
  })

  it('should track HTTPS deep links', () => {
    const onAppStateChange = vi.fn()
    const onUrlOpen = vi.fn()
    setupAutoTracking({ lifecycleClient: { onAppStateChange, onUrlOpen } })

    const listener = onUrlOpen.mock.calls[0][0]
    listener('https://example.com/invite/abc')

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'deeplink.open',
      properties: { url: 'https://example.com/invite/abc' },
    })
  })
})

describe('push notification tracking', () => {
  it('should track push.received for foreground notifications', () => {
    const onNotificationReceived = vi.fn()
    const onNotificationAction = vi.fn()
    setupAutoTracking({ pushClient: { onNotificationReceived, onNotificationAction } })

    const listener = onNotificationReceived.mock.calls[0][0]
    listener({
      notification: { id: 'n1', title: 'New message' },
      foreground: true,
    })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'push.received',
      properties: { id: 'n1', title: 'New message', foreground: true },
    })
  })

  it('should track push.received for background notifications', () => {
    const onNotificationReceived = vi.fn()
    const onNotificationAction = vi.fn()
    setupAutoTracking({ pushClient: { onNotificationReceived, onNotificationAction } })

    const listener = onNotificationReceived.mock.calls[0][0]
    listener({
      notification: { id: 'n2', title: 'Reminder' },
      foreground: false,
    })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'push.received',
      properties: { id: 'n2', title: 'Reminder', foreground: false },
    })
  })

  it('should track push.tapped when user taps notification', () => {
    const onNotificationReceived = vi.fn()
    const onNotificationAction = vi.fn()
    setupAutoTracking({ pushClient: { onNotificationReceived, onNotificationAction } })

    const listener = onNotificationAction.mock.calls[0][0]
    listener({
      notification: { id: 'n3', title: 'Order shipped' },
      actionId: 'view_details',
    })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'push.tapped',
      properties: { id: 'n3', title: 'Order shipped', actionId: 'view_details' },
    })
  })

  it('should track push.tapped without actionId for default tap', () => {
    const onNotificationReceived = vi.fn()
    const onNotificationAction = vi.fn()
    setupAutoTracking({ pushClient: { onNotificationReceived, onNotificationAction } })

    const listener = onNotificationAction.mock.calls[0][0]
    listener({ notification: { id: 'n4', title: 'Update' } })

    expect(mockTrack).toHaveBeenCalledWith({
      name: 'push.tapped',
      properties: { id: 'n4', title: 'Update', actionId: undefined },
    })
  })

  it('should return cleanup that unsubscribes both listeners', () => {
    const unsubReceived = vi.fn()
    const unsubAction = vi.fn()
    const onNotificationReceived = vi.fn(() => unsubReceived)
    const onNotificationAction = vi.fn(() => unsubAction)
    const cleanup = setupAutoTracking({
      pushClient: { onNotificationReceived, onNotificationAction },
    })

    cleanup()
    expect(unsubReceived).toHaveBeenCalled()
    expect(unsubAction).toHaveBeenCalled()
  })
})

// ============================================================================
// Combined
// ============================================================================

describe('combined tracking', () => {
  it('should support all sources at once', () => {
    const authUnsub = vi.fn()
    const routerUnsub = vi.fn()
    const httpUnsub = vi.fn()
    const lifecycleAppUnsub = vi.fn()
    const lifecycleUrlUnsub = vi.fn()
    const pushReceivedUnsub = vi.fn()
    const pushActionUnsub = vi.fn()

    const cleanup = setupAutoTracking({
      authClient: { addEventListener: vi.fn(() => authUnsub) },
      router: { subscribe: vi.fn(() => routerUnsub) },
      httpClient: { addErrorInterceptor: vi.fn(() => httpUnsub) },
      lifecycleClient: {
        onAppStateChange: vi.fn(() => lifecycleAppUnsub),
        onUrlOpen: vi.fn(() => lifecycleUrlUnsub),
      },
      pushClient: {
        onNotificationReceived: vi.fn(() => pushReceivedUnsub),
        onNotificationAction: vi.fn(() => pushActionUnsub),
      },
    })

    cleanup()
    expect(authUnsub).toHaveBeenCalled()
    expect(routerUnsub).toHaveBeenCalled()
    expect(httpUnsub).toHaveBeenCalled()
    expect(lifecycleAppUnsub).toHaveBeenCalled()
    expect(lifecycleUrlUnsub).toHaveBeenCalled()
    expect(pushReceivedUnsub).toHaveBeenCalled()
    expect(pushActionUnsub).toHaveBeenCalled()
  })

  it('should work with no sources', () => {
    const cleanup = setupAutoTracking({})
    expect(cleanup).toBeTypeOf('function')
    cleanup()
  })
})
