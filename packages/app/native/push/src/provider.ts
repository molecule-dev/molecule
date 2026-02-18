/**
 * Push provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  LocalNotificationOptions,
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushToken,
} from './types.js'
import { createWebPushProvider } from './web-provider.js'

const BOND_TYPE = 'push'

/**
 * Sets the push provider implementation.
 * @param provider - The push provider to bond as the active implementation.
 */
export const setProvider = (provider: PushProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the current push provider, creating a default web provider if none is bonded.
 * @returns The active push provider instance.
 */
export const getProvider = (): PushProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebPushProvider())
  }
  return bondGet<PushProvider>(BOND_TYPE)!
}

/**
 * Checks if a push provider has been bonded.
 * @returns Whether a push provider is currently registered.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Checks the current notification permission status.
 * @returns The current permission status (granted, denied, default, or prompt).
 */
export const checkPermission = (): Promise<PermissionStatus> => getProvider().checkPermission()

/**
 * Requests notification permission from the user.
 * @returns The resulting permission status after the user responds.
 */
export const requestPermission = (): Promise<PermissionStatus> => getProvider().requestPermission()

/**
 * Registers for push notifications and obtains a device token.
 * @returns The push token for this device.
 */
export const register = (): Promise<PushToken> => getProvider().register()

/**
 * Gets the current push token.
 * @returns The current token, or `null` if not registered.
 */
export const getToken = (): Promise<PushToken | null> => getProvider().getToken()

/**
 * Subscribes to notification received events.
 * @param listener - Callback invoked when a notification is received.
 * @returns An unsubscribe function to remove the listener.
 */
export const onNotificationReceived = (listener: NotificationReceivedListener): (() => void) =>
  getProvider().onNotificationReceived(listener)

/**
 * Subscribes to notification action events (taps, button clicks).
 * @param listener - Callback invoked when a notification action is triggered.
 * @returns An unsubscribe function to remove the listener.
 */
export const onNotificationAction = (listener: NotificationActionListener): (() => void) =>
  getProvider().onNotificationAction(listener)

/**
 * Schedules a local notification.
 * @param options - Configuration for the notification (title, body, schedule time, etc.).
 * @returns The notification ID that can be used to cancel it later.
 */
export const scheduleLocal = (options: LocalNotificationOptions): Promise<string> =>
  getProvider().scheduleLocal(options)

/**
 * Sets the app icon badge count.
 * @param count - The badge number to display on the app icon.
 * @returns A promise that resolves when the badge count is set.
 */
export const setBadge = (count: number): Promise<void> => getProvider().setBadge(count)

/**
 * Clears the app icon badge count.
 * @returns A promise that resolves when the badge count is cleared.
 */
export const clearBadge = (): Promise<void> => getProvider().clearBadge()
