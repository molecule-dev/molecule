/**
 * Framework-free logic behind the push-notifications toggle
 * ({@link NotificationsSection}). Extracted so the full enable/disable chain —
 * permission → runtime VAPID key fetch → subscribe → persist on the device
 * row — is unit-testable without a browser.
 *
 * The server contract (shared by every molecule api):
 *
 * - `GET /api/devices/push/public-key` → `{ publicKey }` — the VAPID public
 *   key the browser must pass as `applicationServerKey` (Chromium rejects
 *   keyless subscriptions). 404/503 when push is not configured server-side.
 * - `GET /api/devices` → the caller's device rows; the session's own device
 *   is flagged `isCurrent: true`.
 * - `PATCH /api/devices/:id { pushSubscription, hasPushSubscription }` —
 *   persists the browser subscription where the api-side push fan-outs read
 *   it. Without this PATCH the server never knows the subscription exists
 *   and no push can ever reach the user.
 *
 * @module
 */

/** Minimal structural slice of `@molecule/app-http`'s HttpClient used here. */
export interface PushToggleHttp {
  get<T = unknown>(url: string): Promise<{ data: T }>
  patch<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>
}

/** Device row slice returned by `GET /api/devices`. */
export interface PushToggleDevice {
  id: string
  isCurrent?: boolean
  hasPushSubscription?: boolean
}

/** Push token slice returned by `@molecule/app-push` `register()`. */
export interface PushToggleToken {
  value: string
  platform: 'web' | 'ios' | 'android'
}

/** Why an enable/disable attempt failed (mapped to i18n by the component). */
export type PushToggleFailureReason =
  | 'permission-denied'
  | 'server-unconfigured'
  | 'register-failed'
  | 'persist-failed'

/** Result of an enable/disable attempt. */
export type PushToggleResult =
  | { ok: true }
  | { ok: false; reason: PushToggleFailureReason; message?: string }

/**
 * Picks the caller's own device row: the api flags the session device
 * `isCurrent`; fall back to the first row for sessions predating the flag.
 *
 * @param devices - Rows from `GET /api/devices`.
 * @returns The current device row, or `undefined` when the user has none.
 */
export const findCurrentDevice = (
  devices: PushToggleDevice[] | undefined,
): PushToggleDevice | undefined => {
  if (!Array.isArray(devices) || devices.length === 0) return undefined
  return devices.find((device) => device.isCurrent) ?? devices[0]
}

/**
 * Converts an `@molecule/app-push` token into the device resource's
 * `pushSubscription` shape (web PushSubscription JSON, FCM registration for
 * Android, APNs registration for iOS).
 *
 * @param token - The push token returned by `register()`.
 * @returns The `pushSubscription` value to PATCH onto the device row.
 */
export const subscriptionFromToken = (token: PushToggleToken): unknown => {
  if (token.platform === 'android') {
    return { registrationId: token.value, registrationType: 'FCM' }
  }
  if (token.platform === 'ios') {
    return { registrationId: token.value }
  }
  // Web: register() serializes `subscription.toJSON()` — endpoint + keys.
  return JSON.parse(token.value)
}

/**
 * Runs the full enable chain: browser permission → runtime VAPID public key
 * (`GET /api/devices/push/public-key`) → `register({ vapidPublicKey })` →
 * persist the subscription on the current device row.
 *
 * Every failure is returned as a typed reason (never thrown) so the UI can
 * show an honest, specific message instead of hanging or silently reverting.
 *
 * @param deps - The http client + push actions from `usePush()`.
 * @param deps.http - Authenticated http client (`useHttpClient()`).
 * @param deps.requestPermission - `usePush().requestPermission`.
 * @param deps.register - `usePush().register`.
 * @returns `{ ok: true }` or a typed failure.
 */
export const enablePushOnCurrentDevice = async (deps: {
  http: PushToggleHttp
  requestPermission: () => Promise<string>
  register: (options?: { vapidPublicKey?: string }) => Promise<PushToggleToken>
}): Promise<PushToggleResult> => {
  const permission = await deps.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' }
  }

  let publicKey: string | undefined
  try {
    const response = await deps.http.get<{ publicKey?: string }>('/api/devices/push/public-key')
    publicKey = response.data?.publicKey
  } catch (_error) {
    // 404/503 from the bond-gated route — push is not configured server-side.
    // Reported to the user as 'server-unconfigured'; nothing else to log here.
    publicKey = undefined
  }
  if (!publicKey) {
    return { ok: false, reason: 'server-unconfigured' }
  }

  let token: PushToggleToken
  try {
    token = await deps.register({ vapidPublicKey: publicKey })
  } catch (error) {
    // The provider throws already-localized messages (not supported / no
    // service worker in dev builds / push-service rejection) — surface them.
    return {
      ok: false,
      reason: 'register-failed',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  try {
    const devices = await deps.http.get<PushToggleDevice[]>('/api/devices')
    const device = findCurrentDevice(devices.data)
    if (!device) {
      return { ok: false, reason: 'persist-failed' }
    }
    await deps.http.patch(`/api/devices/${device.id}`, {
      pushSubscription: subscriptionFromToken(token),
      hasPushSubscription: true,
    })
  } catch (error) {
    return {
      ok: false,
      reason: 'persist-failed',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  return { ok: true }
}

/**
 * Disables push: unsubscribes the browser (best-effort — a dev build without
 * a service worker has nothing to unsubscribe) and ALWAYS clears the server
 * state so no further pushes target this device.
 *
 * @param deps - The http client + push action from `usePush()`.
 * @param deps.http - Authenticated http client (`useHttpClient()`).
 * @param deps.unregister - `usePush().unregister`.
 * @returns `{ ok: true }` or a typed failure (server state not cleared).
 */
export const disablePushOnCurrentDevice = async (deps: {
  http: PushToggleHttp
  unregister: () => Promise<void>
}): Promise<PushToggleResult> => {
  try {
    await deps.unregister()
  } catch (_error) {
    // Best-effort: browser-side unsubscribe can fail (no service worker in a
    // dev build); the server-side clear below is what stops future sends.
  }

  try {
    const devices = await deps.http.get<PushToggleDevice[]>('/api/devices')
    const device = findCurrentDevice(devices.data)
    if (device) {
      await deps.http.patch(`/api/devices/${device.id}`, {
        pushSubscription: null,
        hasPushSubscription: false,
      })
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'persist-failed',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  return { ok: true }
}

/**
 * Reads whether push is currently enabled for THIS device (server truth:
 * the current device row's `hasPushSubscription`).
 *
 * @param http - Authenticated http client (`useHttpClient()`).
 * @returns `true` when the current device has a stored subscription.
 */
export const readCurrentDevicePushEnabled = async (http: PushToggleHttp): Promise<boolean> => {
  try {
    const devices = await http.get<PushToggleDevice[]>('/api/devices')
    return findCurrentDevice(devices.data)?.hasPushSubscription === true
  } catch (_error) {
    // Devices endpoint unavailable (e.g. unauthenticated preview) — render
    // the toggle off rather than failing the whole settings panel.
    return false
  }
}
