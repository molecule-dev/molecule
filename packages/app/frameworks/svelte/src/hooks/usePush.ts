/**
 * Svelte hook for push notifications, porting React's `usePush`.
 *
 * @module
 */

import { type Readable, writable } from 'svelte/store'

import { getLogger } from '@molecule/app-logger'
import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushRegisterOptions,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Hook return type.
 */
export interface UsePushResult {
  /** The last permission status a check or request reported, null until one runs. */
  permission: Readable<PermissionStatus | null>
  /** The token register() resolved, null until a registration. */
  token: Readable<PushToken | null>
  /** Reads the permission status from the provider. */
  checkPermission: () => Promise<PermissionStatus>
  /** Asks the user for permission and stores the answer. */
  requestPermission: () => Promise<PermissionStatus>
  /** Registers for push and stores the token. */
  register: (options?: PushRegisterOptions) => Promise<PushToken>
  /** Unregisters and clears the token. */
  unregister: () => Promise<void>
  /** Subscribes a notification listener; returns its unsubscribe. */
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  /** Subscribes a notification-action listener; returns its unsubscribe. */
  onNotificationAction: (listener: NotificationActionListener) => () => void
  /** Subscribes a token-change listener; returns its unsubscribe. */
  onTokenChange: (listener: TokenChangeListener) => () => void
  /** Sets the badge count. */
  setBadge: (count: number) => Promise<void>
  /** Clears the badge. */
  clearBadge: () => Promise<void>
}

/**
 * Options for the usePush hook (e.g. check permission on mount).
 */
export interface UsePushOptions {
  /**
   * Whether to check permission status on mount.
   */
  checkOnMount?: boolean
}

/**
 * Push notification state and actions, React's `usePush` in Svelte's idiom:
 * called during component init, `permission` and `token` are readable stores
 * the hook's own actions update, and the rest are plain functions.
 *
 * Uses module-level `getProvider()` — push is a singleton, not
 * context-provided. The provider's listeners are caller-managed: the returned
 * `on*` unsubscribes are the caller's to call, like React's.
 *
 * @param options - Hook options
 * @returns Push notification state and action methods
 * @example
 * ```svelte
 * <script>
 *   import { usePush } from '@molecule/app-svelte'
 *   const { permission, requestPermission, register } = usePush({ checkOnMount: true })
 * </script>
 *
 * {#if $permission === 'default'}
 *   <button onclick={requestPermission}>Enable Notifications</button>
 * {/if}
 * ```
 */
export function usePush(options?: UsePushOptions): UsePushResult {
  const { checkOnMount = false } = options ?? {}
  const provider: PushProvider = getProvider()
  const permission = writable<PermissionStatus | null>(null)
  const token = writable<PushToken | null>(null)

  // React's mount effect: a failed mount check leaves the permission unknown
  // until checkPermission() runs again; the failure goes to the logger.
  if (checkOnMount) {
    provider
      .checkPermission()
      .then((status) => permission.set(status))
      .catch((error: unknown) => {
        getLogger('usePush').warn('Checking push permission on mount failed', { error })
      })
  }

  return {
    permission: { subscribe: permission.subscribe },
    token: { subscribe: token.subscribe },
    checkPermission: async (): Promise<PermissionStatus> => {
      const status = await provider.checkPermission()
      permission.set(status)
      return status
    },
    requestPermission: async (): Promise<PermissionStatus> => {
      const status = await provider.requestPermission()
      permission.set(status)
      return status
    },
    register: async (registerOptions?: PushRegisterOptions): Promise<PushToken> => {
      const pushToken = await provider.register(registerOptions)
      token.set(pushToken)
      return pushToken
    },
    unregister: async (): Promise<void> => {
      await provider.unregister()
      token.set(null)
    },
    onNotificationReceived: (listener: NotificationReceivedListener): (() => void) =>
      provider.onNotificationReceived(listener),
    onNotificationAction: (listener: NotificationActionListener): (() => void) =>
      provider.onNotificationAction(listener),
    onTokenChange: (listener: TokenChangeListener): (() => void) =>
      provider.onTokenChange(listener),
    setBadge: async (count: number): Promise<void> => {
      await provider.setBadge(count)
    },
    clearBadge: async (): Promise<void> => {
      await provider.clearBadge()
    },
  }
}
