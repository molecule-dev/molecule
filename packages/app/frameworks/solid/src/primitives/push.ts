/**
 * Solid.js primitives for push notifications.
 *
 * @module
 */

import { type Accessor, createSignal } from 'solid-js'

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
 * Push primitives return type.
 */
export interface PushPrimitives {
  permission: Accessor<PermissionStatus | null>
  token: Accessor<PushToken | null>
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
 * Create push notification primitives.
 *
 * @returns Push primitives object
 *
 * @example
 * ```tsx
 * import { createPush } from '@molecule/app-solid'
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

  const register = async (options?: PushRegisterOptions): Promise<PushToken> => {
    const pushToken = await provider.register(options)
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

/**
 * Options for {@link usePush}.
 */
export interface UsePushOptions {
  /** Whether to check permission status on mount. */
  checkOnMount?: boolean
}

/**
 * What {@link usePush} returns (the same names React returns).
 */
export type UsePushResult = PushPrimitives

/**
 * Push notification state and actions off the bonded provider, under React's
 * hook name. Uses module-level `getProvider()` — push is a singleton, not
 * context-provided.
 *
 * @param options - Hook options (`checkOnMount` reads the permission once on
 *   mount; a failing check warns through the bonded logger and leaves the
 *   permission unset).
 * @returns Push notification state and action methods.
 * @example
 * ```tsx
 * const { permission, token, requestPermission, register } = usePush({ checkOnMount: true })
 * ```
 */
export function usePush(options?: UsePushOptions): UsePushResult {
  const { checkOnMount = false } = options ?? {}
  const provider = getProvider()

  const [permission, setPermission] = createSignal<PermissionStatus | null>(null)
  const [token, setToken] = createSignal<PushToken | null>(null)

  // Check permission on mount if requested.
  if (checkOnMount) {
    void provider
      .checkPermission()
      .then((status) => setPermission(status))
      .catch((error: unknown) => {
        // The permission stays unknown until checkPermission() is called again.
        getLogger('usePush').warn('Checking push permission on mount failed', { error })
      })
  }

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

  const register = async (registerOptions?: PushRegisterOptions): Promise<PushToken> => {
    const pushToken = await provider.register(registerOptions)
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
    onNotificationReceived: (listener: NotificationReceivedListener) =>
      provider.onNotificationReceived(listener),
    onNotificationAction: (listener: NotificationActionListener) =>
      provider.onNotificationAction(listener),
    onTokenChange: (listener: TokenChangeListener) => provider.onTokenChange(listener),
    setBadge: (count: number) => provider.setBadge(count),
    clearBadge: () => provider.clearBadge(),
  }
}
