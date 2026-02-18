/**
 * Angular push notifications service with reactive state.
 *
 * @module
 */
import { BehaviorSubject, type Observable } from 'rxjs'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Push service interface.
 */
export interface PushService {
  permission$: Observable<PermissionStatus | null>
  token$: Observable<PushToken | null>
  getPermission: () => PermissionStatus | null
  getToken: () => PushToken | null
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: () => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
  destroy: () => void
}

/**
 * Creates an Angular push notifications service with reactive state.
 *
 * @returns Push service with observables and action methods
 *
 * @example
 * ```typescript
 * const push = createPushService()
 *
 * push.permission$.subscribe(status => {
 *   console.log('Permission:', status)
 * })
 *
 * await push.requestPermission()
 * const token = await push.register()
 * ```
 */
export const createPushService = (): PushService => {
  const provider = getProvider()
  const permissionSubject = new BehaviorSubject<PermissionStatus | null>(null)
  const tokenSubject = new BehaviorSubject<PushToken | null>(null)

  return {
    permission$: permissionSubject.asObservable(),
    token$: tokenSubject.asObservable(),
    getPermission: () => permissionSubject.getValue(),
    getToken: () => tokenSubject.getValue(),
    checkPermission: async () => {
      const status = await provider.checkPermission()
      permissionSubject.next(status)
      return status
    },
    requestPermission: async () => {
      const status = await provider.requestPermission()
      permissionSubject.next(status)
      return status
    },
    register: async () => {
      const token = await provider.register()
      tokenSubject.next(token)
      return token
    },
    unregister: async () => {
      await provider.unregister()
      tokenSubject.next(null)
    },
    onNotificationReceived: (listener) => provider.onNotificationReceived(listener),
    onNotificationAction: (listener) => provider.onNotificationAction(listener),
    onTokenChange: (listener) => provider.onTokenChange(listener),
    setBadge: (count) => provider.setBadge(count),
    clearBadge: () => provider.clearBadge(),
    destroy: () => {
      permissionSubject.complete()
      tokenSubject.complete()
    },
  }
}
