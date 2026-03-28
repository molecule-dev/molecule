/**
 * Calendar provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link createCalendar}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { CalendarInstance, CalendarOptions, CalendarProvider } from './types.js'

/** Bond category key for the calendar provider. */
const BOND_TYPE = 'calendar'

/**
 * Registers a calendar provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-calendar-fullcalendar`) during app startup.
 *
 * @param provider - The calendar provider implementation to bond.
 */
export function setProvider(provider: CalendarProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded calendar provider, throwing if none is configured.
 *
 * @returns The bonded calendar provider.
 * @throws {Error} If no calendar provider has been bonded.
 */
export function getProvider(): CalendarProvider {
  const provider = bondGet<CalendarProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-calendar: No provider bonded. Call setProvider() with a calendar bond (e.g. @molecule/app-calendar-fullcalendar).',
    )
  }
  return provider
}

/**
 * Checks whether a calendar provider is currently bonded.
 *
 * @returns `true` if a calendar provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a calendar instance using the bonded provider.
 *
 * @param options - Calendar configuration.
 * @returns A calendar instance.
 * @throws {Error} If no calendar provider has been bonded.
 */
export function createCalendar(options: CalendarOptions): CalendarInstance {
  return getProvider().createCalendar(options)
}
