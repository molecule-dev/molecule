/**
 * `@molecule/app-calendar`
 * Provider management for calendar module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  Calendar,
  CalendarCapabilities,
  CalendarEvent,
  CalendarPermissionStatus,
  CalendarProvider,
  EventInput,
  EventQueryOptions,
} from './types.js'

// ============================================================================
// Provider Management
// ============================================================================

const BOND_TYPE = 'calendar'

/**
 * Set the calendar provider.
 * @param provider - CalendarProvider implementation to register.
 */
export function setProvider(provider: CalendarProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current calendar provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active CalendarProvider instance.
 */
export function getProvider(): CalendarProvider {
  const provider = bondGet<CalendarProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('calendar.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-calendar: No provider set. Call setProvider() with a CalendarProvider implementation (e.g., from @molecule/app-calendar-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a calendar provider has been registered.
 * @returns Whether a CalendarProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get all calendars available on the device.
 * @returns An array of Calendar objects with their metadata.
 */
export async function getCalendars(): Promise<Calendar[]> {
  return getProvider().getCalendars()
}

/**
 * Query calendar events matching the given options.
 * @param options - Query filters (calendar IDs, date range, search text, limit).
 * @returns An array of matching CalendarEvent objects.
 */
export async function getEvents(options?: EventQueryOptions): Promise<CalendarEvent[]> {
  return getProvider().getEvents(options)
}

/**
 * Get a single event by its ID.
 * @param eventId - The event ID to look up.
 * @param calendarId - The calendar ID containing the event.
 * @returns The matching CalendarEvent, or null if not found.
 */
export async function getEventById(
  eventId: string,
  calendarId: string,
): Promise<CalendarEvent | null> {
  return getProvider().getEventById(eventId, calendarId)
}

/**
 * Create a new calendar event.
 * @param event - The event data to create (title, dates, attendees, etc.).
 * @returns The created CalendarEvent with its assigned ID.
 */
export async function createEvent(event: EventInput): Promise<CalendarEvent> {
  return getProvider().createEvent(event)
}

/**
 * Update an existing calendar event.
 * @param eventId - The ID of the event to update.
 * @param event - The partial event data to merge with the existing event.
 * @returns The updated CalendarEvent.
 */
export async function updateEvent(
  eventId: string,
  event: Partial<EventInput>,
): Promise<CalendarEvent> {
  return getProvider().updateEvent(eventId, event)
}

/**
 * Delete a calendar event.
 * @param eventId - The ID of the event to delete.
 * @param calendarId - The calendar ID containing the event.
 * @returns A promise that resolves when the event is deleted.
 */
export async function deleteEvent(eventId: string, calendarId: string): Promise<void> {
  return getProvider().deleteEvent(eventId, calendarId)
}

/**
 * Open the native calendar app, optionally showing a specific date.
 * @param date - The date to navigate to (defaults to today).
 * @returns A promise that resolves when the calendar app is opened.
 */
export async function openCalendar(date?: Date): Promise<void> {
  return getProvider().openCalendar(date)
}

/**
 * Open a specific event in the native calendar app.
 * @param eventId - The ID of the event to open.
 * @returns A promise that resolves when the event is opened.
 */
export async function openEvent(eventId: string): Promise<void> {
  return getProvider().openEvent(eventId)
}

/**
 * Get the current calendar permission status.
 * @returns The permission status: 'granted', 'denied', 'limited', 'prompt', or 'unsupported'.
 */
export async function getPermissionStatus(): Promise<CalendarPermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request calendar permissions from the user.
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<CalendarPermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Open the system settings screen for calendar permissions.
 * @returns A promise that resolves when the settings screen is opened.
 */
export async function openSettings(): Promise<void> {
  return getProvider().openSettings()
}

/**
 * Get the platform's calendar capabilities.
 * @returns The capabilities indicating which calendar features are supported.
 */
export async function getCapabilities(): Promise<CalendarCapabilities> {
  return getProvider().getCapabilities()
}
