/**
 * Angular push notification hooks and state.
 *
 * @module
 */

import { effect, type Signal, signal, untracked } from '@angular/core'

import { getLogger } from '@molecule/app-logger'
import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushRegisterOptions,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider as getPushProvider } from '@molecule/app-push'

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'

/**
 * Options for {@link usePush} (e.g. check permission on mount).
 */
export interface UsePushOptions {
  /** Whether to check permission status on mount. */
  checkOnMount?: boolean
}

/**
 * What {@link usePush} returns: the permission and token as signals and every
 * action as a plain function.
 */
export interface UsePushResult {
  /** The known permission status, `null` until one is read. */
  readonly permission: Signal<PermissionStatus | null>
  /** The registered token, `null` while unregistered. */
  readonly token: Signal<PushToken | null>
  /**
   * Reads the permission status and stores it.
   *
   * @returns The status.
   */
  checkPermission: () => Promise<PermissionStatus>
  /**
   * Asks for permission and stores the status.
   *
   * @returns The status.
   */
  requestPermission: () => Promise<PermissionStatus>
  /**
   * Registers for push notifications and stores the token.
   *
   * @param options - Registration options.
   * @returns The token.
   */
  register: (options?: PushRegisterOptions) => Promise<PushToken>
  /**
   * Unregisters and clears the token.
   *
   * @returns Resolves once unregistered.
   */
  unregister: () => Promise<void>
  /**
   * Subscribes to received notifications.
   *
   * @param listener - Called for every notification.
   * @returns A function that removes the listener.
   */
  onNotificationReceived: (listener: NotificationReceivedListener) => () => void
  /**
   * Subscribes to notification actions.
   *
   * @param listener - Called for every action.
   * @returns A function that removes the listener.
   */
  onNotificationAction: (listener: NotificationActionListener) => () => void
  /**
   * Subscribes to token changes.
   *
   * @param listener - Called for every new token.
   * @returns A function that removes the listener.
   */
  onTokenChange: (listener: TokenChangeListener) => () => void
  /**
   * Sets the badge count.
   *
   * @param count - The count to set.
   * @returns Resolves once set.
   */
  setBadge: (count: number) => Promise<void>
  /**
   * Clears the badge count.
   *
   * @returns Resolves once cleared.
   */
  clearBadge: () => Promise<void>
}

/**
 * Push notification state and actions. Call it in an injection context.
 *
 * Uses module-level `getProvider()` — push is a singleton, not
 * registration-provided.
 *
 * The options may be a signal: `checkOnMount` turning on through it checks the
 * permission once more (when it was off before), the way React re-renders
 * `usePush` with the new option.
 *
 * @param options - Hook options (or a signal of them).
 * @returns The permission and token as signals and the action functions.
 */
export function usePush(options?: MaybeSignal<UsePushOptions>): UsePushResult {
  const provider = getPushProvider()
  const permission = signal<PermissionStatus | null>(null)
  const token = signal<PushToken | null>(null)

  // Check permission on mount if requested. React's effect is keyed on
  // `checkOnMount` alone: it runs once per mount and again only when that
  // option's value changes, so the same-value guard below pins the same runs.
  let lastCheckOnMount: boolean | undefined
  effect(() => {
    const { checkOnMount = false } = readMaybeSignal(options) ?? {}
    if (Object.is(lastCheckOnMount, checkOnMount)) return
    lastCheckOnMount = checkOnMount
    if (!checkOnMount) return
    untracked(() => {
      provider
        .checkPermission()
        .then((status) => permission.set(status))
        .catch((error: unknown) => {
          // The permission stays unknown until checkPermission() is called again.
          getLogger('usePush').warn('Checking push permission on mount failed', { error })
        })
    })
  })

  const checkPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.checkPermission()
    permission.set(status)
    return status
  }

  const requestPermission = async (): Promise<PermissionStatus> => {
    const status = await provider.requestPermission()
    permission.set(status)
    return status
  }

  const register = async (registerOptions?: PushRegisterOptions): Promise<PushToken> => {
    const pushToken = await provider.register(registerOptions)
    token.set(pushToken)
    return pushToken
  }

  const unregister = async (): Promise<void> => {
    await provider.unregister()
    token.set(null)
  }

  const onNotificationReceived = (listener: NotificationReceivedListener): (() => void) =>
    provider.onNotificationReceived(listener)

  const onNotificationAction = (listener: NotificationActionListener): (() => void) =>
    provider.onNotificationAction(listener)

  const onTokenChange = (listener: TokenChangeListener): (() => void) =>
    provider.onTokenChange(listener)

  const setBadge = async (count: number): Promise<void> => {
    await provider.setBadge(count)
  }

  const clearBadge = async (): Promise<void> => {
    await provider.clearBadge()
  }

  return {
    permission: permission.asReadonly(),
    token: token.asReadonly(),
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
