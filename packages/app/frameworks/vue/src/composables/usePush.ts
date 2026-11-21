/**
 * Vue composable for push notifications.
 *
 * @module
 */

import { type MaybeRefOrGetter, type ShallowRef, shallowRef, toValue, watch } from 'vue'

import { getLogger } from '@molecule/app-logger'
import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushRegisterOptions,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Options for the usePush composable (e.g. check permission on mount).
 */
export interface UsePushOptions {
  /**
   * Whether to check permission status on mount.
   */
  checkOnMount?: boolean
}

/**
 * Return type for the usePush composable.
 */
export interface UsePushResult {
  permission: ShallowRef<PermissionStatus | null>
  token: ShallowRef<PushToken | null>
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: (options?: PushRegisterOptions) => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
}

/**
 * The former name of {@link UsePushResult}.
 *
 * @deprecated Renamed to {@link UsePushResult}, `@molecule/app-react`'s name for it.
 */
export type UsePushReturn = UsePushResult

/**
 * Composable for push notifications.
 *
 * Uses module-level getProvider() from `@molecule/app-push` (singleton).
 * Wraps async methods to update reactive refs for permission and token.
 *
 * The options may be reactive (a ref or a getter): `checkOnMount` turning on
 * through them checks the permission once more on the same component, the way
 * a re-render turns React's effect on; turning it off stops future checks.
 *
 * @param options - Composable options (`checkOnMount` reads the permission once
 *   on mount; a failing check logs a warning and leaves the permission unset);
 *   may be reactive, and a change to `checkOnMount` is followed live.
 * @returns Push notification state and action methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePush } from '@molecule/app-vue'
 *
 * const { permission, token, requestPermission, register } = usePush({ checkOnMount: true })
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
export function usePush(options?: MaybeRefOrGetter<UsePushOptions | undefined>): UsePushResult {
  const provider = getProvider()

  const permission = shallowRef<PermissionStatus | null>(null)
  const token = shallowRef<PushToken | null>(null)

  // Check permission if requested. React runs this as an effect keyed on
  // `checkOnMount`: once on mount, and again whenever the option turns on.
  watch(
    () => toValue(options)?.checkOnMount ?? false,
    (checkOnMount) => {
      if (!checkOnMount) return
      provider
        .checkPermission()
        .then((status) => {
          permission.value = status
        })
        .catch((error: unknown) => {
          // The permission stays unknown until checkPermission() is called again.
          getLogger('usePush').warn('Checking push permission on mount failed', { error })
        })
    },
    { immediate: true },
  )

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

  const register = async (options?: PushRegisterOptions): Promise<PushToken> => {
    const pushToken = await provider.register(options)
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
