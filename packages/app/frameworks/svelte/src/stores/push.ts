/**
 * Svelte stores for push notifications.
 *
 * @module
 */

import { type Readable, type Writable, writable } from 'svelte/store'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Create push notification stores from the module-level push provider.
 *
 * @returns Push notification stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createPushStores } from '`@molecule/app-svelte`'
 *
 *   const { permission, token, requestPermission, register } = createPushStores()
 * </script>
 *
 * {#if $permission === 'default'}
 *   <button on:click={requestPermission}>Enable Notifications</button>
 * {:else if $permission === 'granted'}
 *   <p>Token: {$token?.value}</p>
 * {/if}
 * ```
 */
export function createPushStores(): {
  permission: Readable<PermissionStatus | null>
  token: Readable<PushToken | null>
  checkPermission: () => Promise<PermissionStatus>
  requestPermission: () => Promise<PermissionStatus>
  register: () => Promise<PushToken>
  unregister: () => Promise<void>
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  onNotificationAction: (listener: NotificationActionListener) => () => void
  onTokenChange: (listener: TokenChangeListener) => () => void
  setBadge: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
} {
  const provider = getProvider()

  const permissionStore: Writable<PermissionStatus | null> = writable(null)
  const tokenStore: Writable<PushToken | null> = writable(null)

  // Actions that update stores
  const checkPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.checkPermission()
    permissionStore.set(status)
    return status
  }

  const requestPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.requestPermission()
    permissionStore.set(status)
    return status
  }

  const register = async (): Promise<PushToken> => {
    const pushToken = await provider.register()
    tokenStore.set(pushToken)
    return pushToken
  }

  const unregister = async (): Promise<void> => {
    await provider.unregister()
    tokenStore.set(null)
  }

  // Event listeners
  const onNotificationReceived = (listener: NotificationReceivedListener): (() => void) =>
    provider.onNotificationReceived(listener)

  const onNotificationAction = (listener: NotificationActionListener): (() => void) =>
    provider.onNotificationAction(listener)

  const onTokenChange = (listener: TokenChangeListener): (() => void) =>
    provider.onTokenChange(listener)

  // Badge management
  const setBadge = (count: number): Promise<void> => provider.setBadge(count)
  const clearBadge = (): Promise<void> => provider.clearBadge()

  return {
    permission: { subscribe: permissionStore.subscribe } as Readable<PermissionStatus | null>,
    token: { subscribe: tokenStore.subscribe } as Readable<PushToken | null>,
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
