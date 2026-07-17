/**
 * Minimal type declarations for expo-notifications used by this package.
 *
 * expo-notifications is a peer dependency loaded at runtime in a React Native
 * environment. Its entry point uses Flow/Expo-specific syntax that Vitest
 * cannot parse, so installing it in the workspace would break the test suite
 * across every package. This ambient declaration provides the subset of the
 * module's API that this provider actually uses; the real types take over when
 * the package is consumed inside an actual Expo project.
 *
 * @module
 */

declare module 'expo-notifications' {
  /** Minimal notification content shape. */
  interface NotificationContent {
    title: string | null
    body: string | null
    data: Record<string, unknown>
    badge: number | null
    sound: string | { [key: string]: string } | null
  }

  /** Minimal notification request shape. */
  interface NotificationRequest {
    identifier: string
    content: NotificationContent
  }

  /** Minimal notification shape. */
  export interface Notification {
    request: NotificationRequest
  }

  /** Minimal notification response shape. */
  export interface NotificationResponse {
    notification: Notification
    actionIdentifier: string
  }

  /** Minimal push token data shape. */
  export interface ExpoPushToken {
    data: string
  }

  /** Minimal device push token shape. */
  export interface DevicePushToken {
    data: string | object
  }

  /** Minimal scheduled notification shape. */
  export interface ScheduledNotification {
    identifier: string
    content: NotificationContent
  }

  /**
   * Android notification importance levels (subset of expo's `AndroidImportance`).
   * At runtime the real enum from expo-notifications supplies the values; this
   * ambient declaration only provides the type/members the provider references.
   */
  export enum AndroidImportance {
    UNKNOWN = 0,
    MIN = 1,
    LOW = 2,
    DEFAULT = 3,
    HIGH = 4,
    MAX = 5,
  }

  /** Minimal Android notification channel input. */
  export interface NotificationChannelInput {
    /** Human-readable channel name shown in the system notification settings. */
    name: string
    /** Channel importance (controls heads-up display, sound, etc.). */
    importance: AndroidImportance
  }

  /**
   * Trigger describing when/where a scheduled notification fires. `null` presents
   * immediately; `{ channelId }` presents immediately on a specific Android
   * channel; a date trigger may also carry a `channelId` (Android).
   */
  export type NotificationTriggerInput =
    | { date: Date; channelId?: string }
    | { channelId: string }
    | null

  /** Subscription handle returned by add*Listener calls. */
  export interface Subscription {
    remove(): void
  }

  export function getPermissionsAsync(): Promise<{ status: string }>
  export function requestPermissionsAsync(): Promise<{ status: string }>
  export function getExpoPushTokenAsync(options?: { projectId?: string }): Promise<ExpoPushToken>
  export function unregisterForNotificationsAsync(): Promise<void>
  export function setNotificationHandler(handler: {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert: boolean
      shouldPlaySound: boolean
      shouldSetBadge: boolean
    }>
  }): void
  export function addNotificationReceivedListener(
    callback: (notification: Notification) => void,
  ): Subscription
  export function addNotificationResponseReceivedListener(
    callback: (response: NotificationResponse) => void,
  ): Subscription
  export function addPushTokenListener(callback: (tokenData: DevicePushToken) => void): Subscription
  export function setNotificationChannelAsync(
    channelId: string,
    channel: NotificationChannelInput,
  ): Promise<unknown>
  export function scheduleNotificationAsync(request: {
    content: {
      title: string
      body?: string
      data?: Record<string, unknown>
      sound?: boolean
      badge?: number
    }
    trigger: NotificationTriggerInput
  }): Promise<string>
  export function cancelScheduledNotificationAsync(id: string): Promise<void>
  export function cancelAllScheduledNotificationsAsync(): Promise<void>
  export function getAllScheduledNotificationsAsync(): Promise<ScheduledNotification[]>
  export function getPresentedNotificationsAsync(): Promise<Notification[]>
  export function dismissNotificationAsync(id: string): Promise<void>
  export function dismissAllNotificationsAsync(): Promise<void>
  export function setBadgeCountAsync(count: number): Promise<boolean>
  export function getBadgeCountAsync(): Promise<number>
}
