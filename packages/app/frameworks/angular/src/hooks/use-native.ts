/**
 * Angular functions for native capabilities, mirroring `useDevice`,
 * `usePlatform`, `useCapacitorApp` and `usePush` from `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, inject, type Signal, signal } from '@angular/core'

import type { DeviceInfo, FeatureSupport, HardwareInfo, ScreenInfo } from '@molecule/app-device'
import { getProvider as getDeviceProvider } from '@molecule/app-device'
import { getLogger } from '@molecule/app-logger'
import type { Platform, PlatformInfo } from '@molecule/app-platform'
import {
  type CapacitorApp,
  type CapacitorAppOptions,
  type CapacitorAppState,
  createCapacitorApp,
  isPlatform as isPlatformOn,
  platform as platformInfo,
} from '@molecule/app-platform'
import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushRegisterOptions,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider as getPushProvider } from '@molecule/app-push'

/**
 * What {@link useDevice} returns: the provider's info objects and its two
 * helpers.
 */
export interface UseDeviceResult {
  /** The device info. */
  deviceInfo: DeviceInfo
  /** The screen info. */
  screenInfo: ScreenInfo
  /** The hardware info. */
  hardwareInfo: HardwareInfo
  /** Which features this device supports. */
  featureSupport: FeatureSupport
  /**
   * Whether a feature is supported.
   *
   * @param feature - The feature to check.
   * @returns Whether the feature is supported.
   */
  supports: (feature: keyof FeatureSupport) => boolean
  /**
   * Whether the device is online.
   *
   * @returns Whether the device is online.
   */
  isOnline: () => boolean
  /**
   * Whether the app runs standalone (installed).
   *
   * @returns Whether the app is standalone.
   */
  isStandalone: () => boolean
  /** The primary language tag. */
  language: string
  /** The preferred language tags. */
  languages: string[]
}

/**
 * Device information and utility methods. Call it in an injection context.
 *
 * Uses module-level `getProvider()` — device info is a singleton, not
 * registration-provided. Device info is static and doesn't change at runtime,
 * so it is read once, like React's memoized hook.
 *
 * @returns Device information and utility methods.
 */
export function useDevice(): UseDeviceResult {
  const provider = getDeviceProvider()

  return {
    deviceInfo: provider.getDeviceInfo(),
    screenInfo: provider.getScreenInfo(),
    hardwareInfo: provider.getHardwareInfo(),
    featureSupport: provider.getFeatureSupport(),
    supports: (feature: keyof FeatureSupport) => provider.supports(feature),
    isOnline: () => provider.isOnline(),
    isStandalone: () => provider.isStandalone(),
    language: provider.getLanguage(),
    languages: provider.getLanguages(),
  }
}

/**
 * What {@link usePlatform} returns: the detected platform's info and the
 * `isPlatform` helper.
 */
export interface UsePlatformResult {
  /** The detected platform. */
  platform: Platform
  /** Whether the app runs in a native container. */
  isNative: boolean
  /** Whether the platform is mobile. */
  isMobile: boolean
  /** Whether the platform is desktop. */
  isDesktop: boolean
  /** Whether the platform is the web. */
  isWeb: boolean
  /** Whether the app runs in development. */
  isDevelopment: boolean
  /** Whether the app runs in production. */
  isProduction: boolean
  /**
   * Whether the current platform is one of the candidates.
   *
   * @param platforms - The candidate platforms.
   * @returns Whether any candidate matches.
   */
  isPlatform: (...platforms: Platform[]) => boolean
}

/**
 * Platform detection. Call it in an injection context.
 *
 * Uses module-level functions — platform is a singleton, not
 * registration-provided. Platform info is static and doesn't change at
 * runtime, so it is read once, like React's memoized hook.
 *
 * @returns Platform information and utility methods.
 */
export function usePlatform(): UsePlatformResult {
  const info: PlatformInfo = platformInfo()

  return {
    platform: info.platform,
    isNative: info.isNative,
    isMobile: info.isMobile,
    isDesktop: info.isDesktop,
    isWeb: info.isWeb,
    isDevelopment: info.isDevelopment,
    isProduction: info.isProduction,
    isPlatform: (...platforms: Platform[]) => isPlatformOn(...platforms),
  }
}

/**
 * What {@link useCapacitorApp} returns: every state field as a signal and
 * `initialize` as a plain function.
 */
export interface UseCapacitorAppResult {
  /** Whether the app is fully initialized. */
  readonly ready: Signal<boolean>
  /** Whether device ready has fired. */
  readonly deviceReady: Signal<boolean>
  /** Whether push notifications are initialized. */
  readonly pushReady: Signal<boolean>
  /** The initialization error, if any. */
  readonly error: Signal<Error | null>
  /**
   * Runs initialization again (manual re-initialization).
   *
   * @returns Resolves once initialization finished.
   */
  initialize: () => Promise<void>
}

/**
 * Capacitor app initialization and state management. Call it in an injection
 * context (a component field initializer or constructor).
 *
 * Creates a `CapacitorApp` coordinator, subscribes to state changes, and
 * auto-initializes. Cleans up on destroy via `destroy()`.
 *
 * @param options - Capacitor app configuration options.
 * @returns The current app state as signals and an `initialize` function.
 */
export function useCapacitorApp(options: CapacitorAppOptions = {}): UseCapacitorAppResult {
  const app: CapacitorApp = createCapacitorApp(options)

  const state = signal<CapacitorAppState>(app.getState())
  const stop = app.subscribe((newState) => state.set(newState))

  const initialize = async (): Promise<void> => {
    await app.initialize()
  }

  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(stop)
  destroyRef.onDestroy(() => app.destroy())

  // Auto-initialize; the coordinator puts a failure in state, which this hook returns.
  app.initialize().catch((_error: unknown) => {
    // Reported through the coordinator's `error` state field above.
  })

  return {
    ready: computed(() => state().ready),
    deviceReady: computed(() => state().deviceReady),
    pushReady: computed(() => state().pushReady),
    error: computed(() => state().error),
    initialize,
  }
}

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
 * @param options - Hook options.
 * @returns The permission and token as signals and the action functions.
 */
export function usePush(options?: UsePushOptions): UsePushResult {
  const { checkOnMount = false } = options ?? {}
  const provider = getPushProvider()
  const permission = signal<PermissionStatus | null>(null)
  const token = signal<PushToken | null>(null)

  // Check permission on mount if requested.
  if (checkOnMount) {
    provider
      .checkPermission()
      .then((status) => permission.set(status))
      .catch((error: unknown) => {
        // The permission stays unknown until checkPermission() is called again.
        getLogger('usePush').warn('Checking push permission on mount failed', { error })
      })
  }

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
