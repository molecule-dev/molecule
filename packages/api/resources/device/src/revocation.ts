/**
 * Who hears that a device was revoked.
 *
 * Session authorization (`@molecule/api-resource-user`) caches "this device exists" for a few
 * seconds per process. A delete through the device service or the `DELETE /devices/:id` route
 * tells every subscriber ({@link DeviceService.onRevoked}), so the cached answer goes at once and
 * the revoked token is refused on its next request on this process. A harness eval caught the gap
 * (2026-11-25): a check right after `POST /users/logout` still answered 200 with the old cookie.
 *
 * Internal to this package: the bonded service is how other packages subscribe.
 *
 * @module
 */

import type { DeviceService } from './types.js'

/** Called with the revoked device's id, or `null` when several devices went at once. */
type Listener = Parameters<NonNullable<DeviceService['onRevoked']>>[0]

const listeners = new Set<Listener>()

/**
 * Subscribe to revocations.
 *
 * @param listener - Called after each revocation.
 * @returns A function that removes the subscription.
 */
export function addDeviceRevokedListener(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Tell every subscriber that a device, or several, were revoked.
 *
 * @param deviceId - The device id, or `null` when several devices went at once.
 */
export function deviceRevoked(deviceId: string | null): void {
  for (const listener of listeners) listener(deviceId)
}
