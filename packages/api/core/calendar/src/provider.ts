/**
 * Calendar provider singleton accessor.
 *
 * Bond packages call {@link setProvider} during application startup. Handlers
 * call {@link getProvider} or one of the convenience wrappers
 * ({@link listCalendars}, {@link listEvents}, ...) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CalendarEvent,
  CalendarOperationResult,
  CalendarProvider,
  CalendarSummary,
  CalendarUserCredentials,
  FindFreeSlotsOptions,
  FreeBusyResult,
  ListEventsOptions,
} from './types.js'

/** Bond category key for the calendar provider. */
const BOND_TYPE = 'calendar'

/**
 * Registers a calendar provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-calendar-google`) during app startup.
 *
 * @param provider - The calendar provider implementation to bond.
 */
export const setProvider = (provider: CalendarProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded calendar provider, throwing if none is configured.
 *
 * @returns The bonded calendar provider.
 * @throws {Error} If no calendar provider has been bonded.
 */
export const getProvider = (): CalendarProvider => {
  try {
    return bondRequire<CalendarProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('calendar.error.noProvider', undefined, {
        defaultValue: 'Calendar provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a calendar provider is currently bonded.
 *
 * @returns `true` if a calendar provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded calendar provider, returning null if none is bonded.
 *
 * @returns The bonded calendar provider, or `null`.
 */
export const getOptionalProvider = (): CalendarProvider | null => {
  return bondGet<CalendarProvider>(BOND_TYPE) ?? null
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @returns The user's calendar list and any refreshed credentials.
 */
export const listCalendars = (
  credentials: CalendarUserCredentials,
): Promise<CalendarOperationResult<CalendarSummary[]>> => {
  return getProvider().listCalendars(credentials)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @param calendarId - Provider-specific calendar id.
 * @param options - Time range and paging options.
 */
export const listEvents = (
  credentials: CalendarUserCredentials,
  calendarId: string,
  options: ListEventsOptions,
): Promise<CalendarOperationResult<CalendarEvent[]>> => {
  return getProvider().listEvents(credentials, calendarId, options)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @param calendarId - Provider-specific calendar id.
 * @param event - Event payload.
 */
export const createEvent = (
  credentials: CalendarUserCredentials,
  calendarId: string,
  event: CalendarEvent,
): Promise<CalendarOperationResult<CalendarEvent>> => {
  return getProvider().createEvent(credentials, calendarId, event)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @param calendarId - Provider-specific calendar id.
 * @param eventId - Event id to update.
 * @param updates - Partial event payload to merge.
 */
export const updateEvent = (
  credentials: CalendarUserCredentials,
  calendarId: string,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id'>>,
): Promise<CalendarOperationResult<CalendarEvent>> => {
  return getProvider().updateEvent(credentials, calendarId, eventId, updates)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @param calendarId - Provider-specific calendar id.
 * @param eventId - Event id to delete.
 */
export const deleteEvent = (
  credentials: CalendarUserCredentials,
  calendarId: string,
  eventId: string,
): Promise<CalendarOperationResult<void>> => {
  return getProvider().deleteEvent(credentials, calendarId, eventId)
}

/**
 * Convenience wrapper that delegates to the bonded provider.
 *
 * @param credentials - The user's OAuth credentials.
 * @param calendarIds - One or more provider-specific calendar ids.
 * @param options - Time window and slot duration.
 */
export const findFreeSlots = (
  credentials: CalendarUserCredentials,
  calendarIds: string[],
  options: FindFreeSlotsOptions,
): Promise<CalendarOperationResult<FreeBusyResult>> => {
  return getProvider().findFreeSlots(credentials, calendarIds, options)
}
