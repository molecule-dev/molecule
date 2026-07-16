# @molecule/api-calendar-microsoft

Microsoft Calendar bond for molecule.dev.

Implements the {@link CalendarProvider} contract from
`@molecule/api-calendar` against the Microsoft Graph v1.0 REST API
(Outlook / Office 365 calendars).

## Setup

1. Register an app in
   [Microsoft Entra ID](https://entra.microsoft.com/) with delegated
   Microsoft Graph permissions: at minimum `Calendars.ReadWrite`,
   `Schedule.Read` (or `Calendars.Read.Shared` for the
   `getSchedule` call), and `offline_access` so refresh tokens are
   issued.
2. Set `OAUTH_MICROSOFT_CLIENT_ID` and `OAUTH_MICROSOFT_CLIENT_SECRET`
   in the API environment (or pass `clientId` / `clientSecret` to
   {@link createProvider}).
3. Persist each user's `accessToken` + `refreshToken` after OAuth
   completion. Pass them to every `@molecule/api-calendar` call.
4. Persist the {@link CalendarOperationResult.credentials} returned by
   each call when present — Microsoft may rotate both the access AND
   refresh tokens.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-calendar'
import { provider } from '@molecule/api-calendar-microsoft'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-calendar-microsoft @molecule/api-bond @molecule/api-calendar @molecule/api-http @molecule/api-secrets
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

#### `MicrosoftCalendarProviderOptions`

Configuration options for {@link createProvider}.

```typescript
interface MicrosoftCalendarProviderOptions {
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
```

### Functions

#### `computeFreeSlots(busyBlocks, windowStart, windowEnd, durationMinutes)`

Computes free slots from a list of busy blocks within a window.

Same algorithm as the Google bond's `computeFreeSlots`; inlined here so
sibling provider bonds remain independent of each other.

```typescript
function computeFreeSlots(busyBlocks: { start: string; end: string; }[], windowStart: string, windowEnd: string, durationMinutes: number): FreeSlot[]
```

- `busyBlocks` — Busy blocks (any order; will be sorted).
- `windowStart` — ISO 8601 lower bound of the search window.
- `windowEnd` — ISO 8601 upper bound of the search window.
- `durationMinutes` — Required slot duration in minutes.

**Returns:** Free slots that fully fit within the window.

#### `createProvider(options)`

Creates a Microsoft Calendar provider.

```typescript
function createProvider(options?: MicrosoftCalendarProviderOptions): CalendarProvider
```

- `options` — Optional configuration. Falls back to

**Returns:** A {@link CalendarProvider} implementation.

### Constants

#### `calendarMicrosoftSecretDefinitions`

Secret definitions required by the Microsoft calendar bond.

```typescript
const calendarMicrosoftSecretDefinitions: SecretDefinition[]
```

#### `provider`

The Microsoft Calendar provider. Lazily initialized on first use so that
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
import { provider } from '@molecule/api-calendar-microsoft'

export function setupCalendarMicrosoft(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-calendar` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OAUTH_MICROSOFT_CLIENT_ID` *(required)* — Microsoft application (client) ID
  - Setup: Microsoft Entra ID → App registrations → New registration; copy the Application (client) ID.
  - Get it here: [https://entra.microsoft.com/](https://entra.microsoft.com/)
- `OAUTH_MICROSOFT_CLIENT_SECRET` *(required)* — Microsoft client secret
  - Setup: App registration → Certificates & secrets → New client secret; copy the Value.
  - Get it here: [https://entra.microsoft.com/](https://entra.microsoft.com/)

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-calendar`
- `@molecule/api-http`
- `@molecule/api-secrets`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Creating an event through the UI (title + start/end) persists it and
  it appears on the calendar view / event list at the right date AND time —
  reload the page and it is still there.
- [ ] Editing or moving an event (new time, new title) reflects immediately
  in the view, and deleting one removes it from both the view and the list.
- [ ] Timezone is correct: an event created for a local time shows at THAT
  local time, not shifted by hours — events carry an IANA `timeZone` and
  ISO 8601 start/end, so a UTC/offset bug surfaces as a wrong displayed hour.
- [ ] If the app surfaces availability / free slots (findFreeSlots), a slot
  that overlaps an existing event no longer shows as free.
- [ ] External-OAuth caveat: bonds sync to a real Google/Microsoft/iCloud
  calendar via per-user OAuth, which the sandbox usually cannot drive —
  verify against the app's OWN stored events (its DB-backed calendar), not
  the live external provider.
- [ ] Authorization: a user sees and edits only their own events — no UI or
  endpoint returns or mutates another user's calendar/event by id, and the
  per-user OAuth credentials never reach the client.
