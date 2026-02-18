/**
 * Vue composable for push notifications.
 *
 * @module
 */

import { onScopeDispose, type ShallowRef, shallowRef } from 'vue'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Return type for the usePush composable.
 */
export interface UsePushReturn {
  permission: ShallowRef<PermissionStatus | null>
  token: ShallowRef<PushToken | null>
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
 * Composable for push notifications.
 *
 * Uses module-level getProvider() from `@molecule/app-push` (singleton).
 * Wraps async methods to update reactive refs for permission and token.
 *
 * @returns Push notification state and action methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePush } from '`@molecule/app-vue`'
 *
 * const { permission, token, requestPermission, register } = usePush()
 *
 * async function enablePush() {
 *   await requestPermission()
 *   if (permission.value === 'granted') {
 *     await register()
 *   }
 * }
 * </script>
 *
 * <template>
 *   <p>Permission: {{ permission }}</p>
 *   <button v-if="permission !== 'granted'" @click="enablePush">Enable Push</button>
 * </template>
 * ```
 */
export function usePush(): UsePushReturn {
  const provider = getProvider()

  const permission = shallowRef<PermissionStatus | null>(null)
  const token = shallowRef<PushToken | null>(null)

  const tokenChangeUnsub = provider.onTokenChange((newToken) => {
    token.value = newToken
  })

  onScopeDispose(() => {
    tokenChangeUnsub()
  })

  const checkPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.checkPermission()
    permission.value = status
    return status
  }

  const requestPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.requestPermission()
    permission.value = status
    return status
  }

  const register = async (): Promise<PushToken> => {
    const pushToken = await provider.register()
    token.value = pushToken
    return pushToken
  }

  const unregister = async (): Promise<void> => {
    await provider.unregister()
    token.value = null
  }

  const onNotificationReceived = (listener: NotificationReceivedListener): (() => void) =>
    provider.onNotificationReceived(listener)

  const onNotificationAction = (listener: NotificationActionListener): (() => void) =>
    provider.onNotificationAction(listener)

  const onTokenChange = (listener: TokenChangeListener): (() => void) =>
    provider.onTokenChange(listener)

  const setBadge = (count: number): Promise<void> => provider.setBadge(count)

  const clearBadge = (): Promise<void> => provider.clearBadge()

  return {
    permission,
    token,
    checkPermission,
    requestPermission,
    register,
    unregister,
    onNotificationReceived,
    onNotificationAction,
    onTokenChange,
    setBadge,
    clearBadge,
  }
}
