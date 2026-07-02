# @molecule/api-calendar-google

Google Calendar bond for molecule.dev.

Implements the {@link CalendarProvider} contract from
`@molecule/api-calendar` against the Google Calendar v3 REST API.

## Setup

1. Create OAuth credentials in the
   [Google API Console](https://console.developers.google.com/apis/credentials).
   The same OAuth client used for "Sign in with Google" can be reused
   here — request the additional `https://www.googleapis.com/auth/calendar`
   scope when consenting.
2. Set `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET` in the
   API environment (or pass `clientId` / `clientSecret` to
   {@link createProvider}).
3. Persist each user's `accessToken` + `refreshToken` after OAuth
   completion. Pass them to every `@molecule/api-calendar` call.
4. Persist the {@link CalendarOperationResult.credentials} returned by
   each call when present — Google may rotate the access token.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-calendar'
import { provider } from '@molecule/api-calendar-google'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-calendar-google
```

## API

### Interfaces

#### `BusyBlock`

A contiguous busy block returned from a free/busy query.

```typescript
interface BusyBlock {
    /** ISO 8601 start of the busy block. */
    start: string;
    /** ISO 8601 end of the busy block. */
    end: string;
    /** Originating calendar id. */
    calendarId: string;
}
```

#### `CalendarEvent`

A calendar event.

Times are ISO 8601 strings. For all-day events, prefer date-only strings
(`YYYY-MM-DD`) and set {@link CalendarEvent.allDay} to `true`.

```typescript
interface CalendarEvent {
    /** Provider-specific event identifier. May be undefined for new events. */
    id?: string;
    /** Event title (caller is responsible for any i18n on user-visible text). */
    summary: string;
    /** Optional rich description / notes. */
    description?: string;
    /** Event location string. */
    location?: string;
    /** ISO 8601 start (date-time, or `YYYY-MM-DD` if all-day). */
    start: string;
    /** ISO 8601 end (date-time, or `YYYY-MM-DD` if all-day). */
    end: string;
    /** IANA time zone for the start/end values. */
    timeZone?: string;
    /** Whether this event spans entire day(s). Defaults to `false`. */
    allDay?: boolean;
    /** Optional attendee list. */
    attendees?: EventAttendee[];
    /** Provider-specific status flag (`confirmed`, `tentative`, `cancelled`). */
    status?: 'confirmed' | 'tentative' | 'cancelled' | string;
    /** Conferencing / meeting link, if present. */
    hangoutLink?: string;
    /** Arbitrary provider data (kept for round-tripping). */
    metadata?: Record<string, unknown>;
}
```

#### `CalendarOperationResult`

Wrapper returned from every {@link CalendarProvider} method so callers
can persist refreshed credentials when the provider rotates them.

```typescript
interface CalendarOperationResult<T> {
    /** Operation payload. `void` operations return `undefined`. */
    data: T;
    /**
     * Refreshed credentials, present iff the access token was rotated during
     * this call. Callers MUST persist these so subsequent calls succeed.
     */
    credentials?: CalendarUserCredentials;
}
```

#### `CalendarProvider`

Calendar provider contract.

Every method takes user-scoped {@link CalendarUserCredentials} so the
same provider instance can serve multiple users. Implementations are
responsible for refreshing expired tokens transparently and returning
any updated credentials via {@link CalendarOperationResult.credentials}.

```typescript
interface CalendarProvider {
    /**
     * Lists the calendars accessible to the authenticated user.
     *
     * @param credentials - The user's OAuth credentials.
     * @returns The user's calendar list and any refreshed credentials.
     */
    listCalendars(credentials: CalendarUserCredentials): Promise<CalendarOperationResult<CalendarSummary[]>>;
    /**
     * Lists events on a specific calendar within a time window.
     *
     * @param credentials - The user's OAuth credentials.
     * @param calendarId - Provider-specific calendar id.
     * @param options - Time range and paging options.
     */
    listEvents(credentials: CalendarUserCredentials, calendarId: string, options: ListEventsOptions): Promise<CalendarOperationResult<CalendarEvent[]>>;
    /**
     * Creates a new event on a calendar.
     *
     * @param credentials - The user's OAuth credentials.
     * @param calendarId - Provider-specific calendar id.
     * @param event - Event payload (id is ignored; provider assigns one).
     */
    createEvent(credentials: CalendarUserCredentials, calendarId: string, event: CalendarEvent): Promise<CalendarOperationResult<CalendarEvent>>;
    /**
     * Updates an existing event by id.
     *
     * @param credentials - The user's OAuth credentials.
     * @param calendarId - Provider-specific calendar id.
     * @param eventId - Event id to update.
     * @param updates - Partial event payload to merge.
     */
    updateEvent(credentials: CalendarUserCredentials, calendarId: string, eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>): Promise<CalendarOperationResult<CalendarEvent>>;
    /**
     * Deletes an event by id.
     *
     * @param credentials - The user's OAuth credentials.
     * @param calendarId - Provider-specific calendar id.
     * @param eventId - Event id to delete.
     */
    deleteEvent(credentials: CalendarUserCredentials, calendarId: string, eventId: string): Promise<CalendarOperationResult<void>>;
    /**
     * Computes free slots across one or more calendars.
     *
     * @param credentials - The user's OAuth credentials.
     * @param calendarIds - One or more provider-specific calendar ids.
     * @param options - Time window and slot duration.
     */
    findFreeSlots(credentials: CalendarUserCredentials, calendarIds: string[], options: FindFreeSlotsOptions): Promise<CalendarOperationResult<FreeBusyResult>>;
}
```

#### `CalendarSummary`

A single calendar in a user's calendar list.

```typescript
interface CalendarSummary {
    /** Provider-specific calendar identifier (opaque). */
    id: string;
    /** Human-readable calendar name. */
    summary: string;
    /** Optional longer description. */
    description?: string;
    /** IANA time zone, e.g. `America/Los_Angeles`. */
    timeZone?: string;
    /** Whether this calendar is the user's primary calendar. */
    primary?: boolean;
    /** Access role granted to the authenticated user (provider-specific). */
    accessRole?: string;
}
```

#### `CalendarUserCredentials`

OAuth token bundle for a single user. Bonds use these to call the
provider's API on behalf of that user, refreshing the access token
automatically when it expires.

```typescript
interface CalendarUserCredentials {
    /** Current access token. */
    accessToken: string;
    /** Refresh token used to mint new access tokens. */
    refreshToken: string;
    /** Optional epoch-millis timestamp for the access token's expiry. */
    expiresAt?: number;
}
```

#### `EventAttendee`

Attendee information attached to a calendar event.

```typescript
interface EventAttendee {
    /** Attendee email address. */
    email: string;
    /** Optional display name. */
    displayName?: string;
    /** Whether attendance is optional. */
    optional?: boolean;
    /** RSVP response status (provider-specific values). */
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | string;
}
```

#### `FindFreeSlotsOptions`

Query parameters for the free/busy / free-slot computation.

```typescript
interface FindFreeSlotsOptions {
    /** ISO 8601 lower bound (inclusive). */
    timeMin: string;
    /** ISO 8601 upper bound (exclusive). */
    timeMax: string;
    /** Required slot duration in minutes. */
    durationMinutes: number;
    /** Optional IANA time zone for the returned slot boundaries. */
    timeZone?: string;
}
```

#### `FreeBusyResult`

Result of a free/busy lookup plus computed free slots.

```typescript
interface FreeBusyResult {
    /** Aggregated busy blocks across all queried calendars. */
    busy: BusyBlock[];
    /** Computed free slots that fit `durationMinutes`. */
    freeSlots: FreeSlot[];
}
```

#### `FreeSlot`

A free slot of {@link FindFreeSlotsOptions.durationMinutes} length.

```typescript
interface FreeSlot {
    /** ISO 8601 slot start. */
    start: string;
    /** ISO 8601 slot end. */
    end: string;
}
```

#### `GoogleCalendarProviderOptions`

Configuration options for {@link createProvider}.

```typescript
interface GoogleCalendarProviderOptions {
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
```

#### `ListEventsOptions`

Query parameters for listing events on a calendar.

```typescript
interface ListEventsOptions {
    /** ISO 8601 lower bound (inclusive). */
    timeMin: string;
    /** ISO 8601 upper bound (exclusive). */
    timeMax: string;
    /** Maximum number of events to return. Provider-defined cap when omitted. */
    maxResults?: number;
    /** When true, recurring events are returned as individual instances. */
    singleEvents?: boolean;
    /** Optional sort order — `startTime` is provider-supported by Google. */
    orderBy?: 'startTime' | 'updated';
}
```

### Functions

#### `computeFreeSlots(busyBlocks, windowStart, windowEnd, durationMinutes)`

Computes free slots from a sorted list of busy blocks.

```typescript
function computeFreeSlots(busyBlocks: { start: string; end: string; }[], windowStart: string, windowEnd: string, durationMinutes: number): FreeSlot[]
```

- `busyBlocks` — Busy blocks (any order; will be sorted).
- `windowStart` — ISO 8601 lower bound of the search window.
- `windowEnd` — ISO 8601 upper bound of the search window.
- `durationMinutes` — Required slot duration in minutes.

**Returns:** Free slots that fully fit within the window.

#### `createProvider(options)`

Creates a Google Calendar provider.

```typescript
function createProvider(options?: GoogleCalendarProviderOptions): CalendarProvider
```

- `options` — Optional configuration. Falls back to

**Returns:** A {@link CalendarProvider} implementation.

### Constants

#### `provider`

The Google Calendar provider. Lazily initialized on first use so that
environment variables are read at call time rather than import time.

```typescript
const provider: CalendarProvider
```

## Core Interface
Implements `@molecule/api-calendar` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-calendar'
import { provider } from '@molecule/api-calendar-google'

export function setupCalendarGoogle(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-calendar` ^1.0.0
- `@molecule/api-http` ^1.0.0

### Environment Variables

- `OAUTH_GOOGLE_CLIENT_ID` *(required)* — Google OAuth client ID
  - Setup: Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application); add your app origin and {apiUrl}/api/users/log-in/oauth as an authorized redirect URI.
  - Get it here: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  - Example: `1234567890-abc.apps.googleusercontent.com`
- `OAUTH_GOOGLE_CLIENT_SECRET` *(required)* — Google OAuth client secret
  - Setup: Shown when creating the OAuth 2.0 Client ID in Google Cloud Console.
  - Get it here: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  - Example: `GOCSPX-...`
