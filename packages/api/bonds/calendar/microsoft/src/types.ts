/**
 * Microsoft Calendar bond types for molecule.dev.
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
       * The Microsoft (Azure AD / Entra ID) OAuth client ID. Required to
       * refresh user access tokens for Microsoft Graph Calendar.
       *
       * @see https://learn.microsoft.com/en-us/graph/auth/auth-concepts
       */
      OAUTH_MICROSOFT_CLIENT_ID?: string

      /**
       * The Microsoft (Azure AD / Entra ID) OAuth client secret. Required to
       * refresh user access tokens for Microsoft Graph Calendar.
       *
       * @see https://learn.microsoft.com/en-us/graph/auth/auth-concepts
       */
      OAUTH_MICROSOFT_CLIENT_SECRET?: string
    }
  }
}

/**
 * Configuration options for {@link createProvider}.
 */
export interface MicrosoftCalendarProviderOptions {
  /**
   * OAuth client id used to refresh user access tokens. Defaults to
   * `process.env.OAUTH_MICROSOFT_CLIENT_ID`.
   */
  clientId?: string
  /**
   * OAuth client secret used to refresh user access tokens. Defaults to
   * `process.env.OAUTH_MICROSOFT_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * Override the Microsoft Graph API base URL. Useful for tests pointing
   * at a fake Microsoft Graph server. Defaults to
   * `https://graph.microsoft.com/v1.0`.
   */
  apiBaseUrl?: string
  /**
   * Override the Microsoft OAuth token endpoint. Useful for tests. Defaults
   * to `https://login.microsoftonline.com/common/oauth2/v2.0/token`.
   */
  tokenUrl?: string
  /**
   * OAuth scope requested when refreshing access tokens. Defaults to
   * `https://graph.microsoft.com/.default offline_access`.
   */
  scope?: string
  /**
   * Request timeout in milliseconds. Defaults to `15_000`.
   */
  timeoutMs?: number
}
