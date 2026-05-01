/**
 * Google Calendar bond types for molecule.dev.
 *
 * @module
 */

export type {
  BusyBlock,
  CalendarEvent,
  CalendarOperationResult,
  CalendarProvider,
  CalendarSummary,
  CalendarUserCredentials,
  EventAttendee,
  FindFreeSlotsOptions,
  FreeBusyResult,
  FreeSlot,
  ListEventsOptions,
} from '@molecule/api-calendar'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The Google OAuth client ID. Required to refresh user access tokens.
       *
       * @see https://developers.google.com/identity/protocols/oauth2
       */
      OAUTH_GOOGLE_CLIENT_ID?: string

      /**
       * The Google OAuth client secret. Required to refresh user access tokens.
       *
       * @see https://developers.google.com/identity/protocols/oauth2
       */
      OAUTH_GOOGLE_CLIENT_SECRET?: string
    }
  }
}

/**
 * Configuration options for {@link createProvider}.
 */
export interface GoogleCalendarProviderOptions {
  /**
   * OAuth client id used to refresh user access tokens. Defaults to
   * `process.env.OAUTH_GOOGLE_CLIENT_ID`.
   */
  clientId?: string
  /**
   * OAuth client secret used to refresh user access tokens. Defaults to
   * `process.env.OAUTH_GOOGLE_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * Override the Google Calendar API base URL. Useful for tests pointing
   * at a fake Google API server. Defaults to
   * `https://www.googleapis.com/calendar/v3`.
   */
  apiBaseUrl?: string
  /**
   * Override the Google OAuth token endpoint. Useful for tests. Defaults
   * to `https://oauth2.googleapis.com/token`.
   */
  tokenUrl?: string
  /**
   * Request timeout in milliseconds. Defaults to `15_000`.
   */
  timeoutMs?: number
}
