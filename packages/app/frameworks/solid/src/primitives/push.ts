/**
 * Solid.js primitives for push notifications.
 *
 * @module
 */

import { type Accessor, createSignal } from 'solid-js'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Push primitives return type.
 */
export interface PushPrimitives {
  permission: Accessor<PermissionStatus | null>
  token: Accessor<PushToken | null>
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: () => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
}

/**
 * Create push notification primitives.
 *
 * @returns Push primitives object
 *
 * @example
 * ```tsx
 * import { createPush } from '`@molecule/app-solid`'
 *
 * function NotificationButton() {
 *   const { permission, requestPermission, register } = createPush()
 *
 *   const handleEnable = async () => {
 *     const status = await requestPermission()
 *     if (status === 'granted') {
 *       await register()
 *     }
 *   }
 *
 *   return (
 *     <Show when={permission() !== 'granted'}>
 *       <button onClick={handleEnable}>Enable Notifications</button>
 *     </Show>
 *   )
 * }
 * ```
 */
export function createPush(): PushPrimitives {
  const provider = getProvider()

  const [permission, setPermission] = createSignal<PermissionStatus | null>(null)
  const [token, setToken] = createSignal<PushToken | null>(null)

  const checkPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.checkPermission()
    setPermission(status)
    return status
  }

  const requestPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.requestPermission()
    setPermission(status)
    return status
  }

  const register = async (): Promise<PushToken> => {
    const pushToken = await provider.register()
    setToken(pushToken)
    return pushToken
  }

  const unregister = async (): Promise<void> => {
    await provider.unregister()
    setToken(null)
  }

  return {
    permission,
    token,
    checkPermission,
    requestPermission,
    register,
    unregister,
    onNotificationReceived: (listener) => provider.onNotificationReceived(listener),
    onNotificationAction: (listener) => provider.onNotificationAction(listener),
    onTokenChange: (listener) => provider.onTokenChange(listener),
    setBadge: (count) => provider.setBadge(count),
    clearBadge: () => provider.clearBadge(),
  }
}
