/**
 * React hook for push notifications.
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'
import { getProvider } from '@molecule/app-push'

/**
 * Hook return type.
 */
export interface UsePushResult {
  permission: PermissionStatus | null
  token: PushToken | null
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
 * Options for the usePush hook (e.g. check permission on mount).
 */
export interface UsePushOptions {
  /**
   * Whether to check permission status on mount.
   */
  checkOnMount?: boolean
}

/**
 * Hook for push notification state and actions.
 *
 * Uses module-level `getProvider()` — push is a singleton, not context-provided.
 *
 * @param options - Hook options
 * @returns Push notification state and action methods
 *
 * @example
 * ```tsx
 * const { permission, token, requestPermission, register } = usePush({ checkOnMount: true })
 *
 * if (permission === 'default') {
 *   return <button onClick={requestPermission}>Enable Notifications</button>
 * }
 * ```
 */
export function usePush(options?: UsePushOptions): UsePushResult {
  const { checkOnMount = false } = options ?? {}
  const providerRef = useRef<PushProvider>(getProvider())
  const [permission, setPermission] = useState<PermissionStatus | null>(null)
  const [token, setToken] = useState<PushToken | null>(null)

  // Check permission on mount if requested
  useEffect(() => {
    if (checkOnMount) {
      providerRef.current
        .checkPermission()
        .then(setPermission)
        .catch(() => {
          // Silently fail
        })
    }
  }, [checkOnMount])

  const checkPermission = useCallback(async () => {
    const status = await providerRef.current.checkPermission()
    setPermission(status)
    return status
  }, [])

  const requestPermission = useCallback(async () => {
    const status = await providerRef.current.requestPermission()
    setPermission(status)
    return status
  }, [])

  const register = useCallback(async () => {
    const pushToken = await providerRef.current.register()
    setToken(pushToken)
    return pushToken
  }, [])

  const unregister = useCallback(async () => {
    await providerRef.current.unregister()
    setToken(null)
  }, [])

  const onNotificationReceived = useCallback((listener: NotificationReceivedListener) => {
    return providerRef.current.onNotificationReceived(listener)
  }, [])

  const onNotificationAction = useCallback((listener: NotificationActionListener) => {
    return providerRef.current.onNotificationAction(listener)
  }, [])

  const onTokenChange = useCallback((listener: TokenChangeListener) => {
    return providerRef.current.onTokenChange(listener)
  }, [])

  const setBadge = useCallback(async (count: number) => {
    await providerRef.current.setBadge(count)
  }, [])

  const clearBadge = useCallback(async () => {
    await providerRef.current.clearBadge()
  }, [])

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
