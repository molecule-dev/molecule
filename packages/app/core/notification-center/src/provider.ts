/**
 * Notification center provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link createNotificationCenter}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  NotificationCenterInstance,
  NotificationCenterOptions,
  NotificationCenterProvider,
} from './types.js'

/** Bond category key for the notification center provider. */
const BOND_TYPE = 'notification-center'

/**
 * Registers a notification center provider as the active singleton. Called by
 * bond packages (e.g. `@molecule/app-notification-center-default`) during app
 * startup.
 *
 * @param provider - The notification center provider implementation to bond.
 */
export function setProvider(provider: NotificationCenterProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded notification center provider, throwing if none is
 * configured.
 *
 * @returns The bonded notification center provider.
 * @throws {Error} If no notification center provider has been bonded.
 */
export function getProvider(): NotificationCenterProvider {
  const provider = bondGet<NotificationCenterProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-notification-center: No provider bonded. Call setProvider() with a notification center bond (e.g. @molecule/app-notification-center-default).',
    )
  }
  return provider
}

/**
 * Checks whether a notification center provider is currently bonded.
 *
 * @returns `true` if a notification center provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a notification center instance using the bonded provider.
 *
 * @param options - Notification center configuration.
 * @returns A notification center instance.
 * @throws {Error} If no notification center provider has been bonded.
 */
export function createNotificationCenter(
  options: NotificationCenterOptions,
): NotificationCenterInstance {
  return getProvider().createNotificationCenter(options)
}
