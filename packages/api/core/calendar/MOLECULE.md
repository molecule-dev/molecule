# @molecule/api-calendar

Calendar core interface for molecule.dev (server-side).

Defines a stack-neutral contract for OAuth-backed calendar bonds (Google,
Microsoft, iCloud, etc.) consumed by handlers and background jobs. Bond a
provider at startup, then call the convenience wrappers from anywhere.

## Quick Start

```typescript
import { setProvider, listEvents } from '@molecule/api-calendar'
import { provider } from '@molecule/api-calendar-google'

setProvider(provider)

const { data, credentials } = await listEvents(
  userCreds,
  'primary',
  { timeMin: '2026-05-01T00:00:00Z', timeMax: '2026-05-08T00:00:00Z' },
)

if (credentials) {
  await persistRefreshedCredentials(userId, credentials)
}
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-calendar @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `BusyBlock`

A contiguous busy block returned from a free/busy query.

```typescript
interface BusyBlock {
  /** ISO 8601 start of the busy block. */
  start: string
  /** ISO 8601 end of the busy block. */
  end: string
  /** Originating calendar id. */
  calendarId: string
}
```

#### `CalendarEvent`

A calendar event.

Times are ISO 8601 strings. For all-day events, prefer date-only strings
(`YYYY-MM-DD`) and set {@link CalendarEvent.allDay} to `true`.

```typescript
interface CalendarEvent {
  /** Provider-specific event identifier. May be undefined for new events. */
  id?: string
  /** Event title (caller is responsible for any i18n on user-visible text). */
  summary: string
  /** Optional rich description / notes. */
  description?: string
  /** Event location string. */
  location?: string
  /** ISO 8601 start (date-time, or `YYYY-MM-DD` if all-day). */
  start: string
  /** ISO 8601 end (date-time, or `YYYY-MM-DD` if all-day). */
  end: string
  /** IANA time zone for the start/end values. */
  timeZone?: string
  /** Whether this event spans entire day(s). Defaults to `false`. */
  allDay?: boolean
  /** Optional attendee list. */
  attendees?: EventAttendee[]
  /** Provider-specific status flag (`confirmed`, `tentative`, `cancelled`). */
  status?: 'confirmed' | 'tentative' | 'cancelled' | string
  /** Conferencing / meeting link, if present. */
  hangoutLink?: string
  /** Arbitrary provider data (kept for round-tripping). */
  metadata?: Record<string, unknown>
}
```

#### `CalendarOperationResult`

Wrapper returned from every {@link CalendarProvider} method so callers
can persist refreshed credentials when the provider rotates them.

```typescript
interface CalendarOperationResult<T> {
  /** Operation payload. `void` operations return `undefined`. */
  data: T
  /**
   * Refreshed credentials, present iff the access token was rotated during
   * this call. Callers MUST persist these so subsequent calls succeed.
   */
  credentials?: CalendarUserCredentials
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
  listCalendars(
    credentials: CalendarUserCredentials,
  ): Promise<CalendarOperationResult<CalendarSummary[]>>

  /**
   * Lists events on a specific calendar within a time window.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param options - Time range and paging options.
   */
  listEvents(
    credentials: CalendarUserCredentials,
    calendarId: string,
    options: ListEventsOptions,
  ): Promise<CalendarOperationResult<CalendarEvent[]>>

  /**
   * Creates a new event on a calendar.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param event - Event payload (id is ignored; provider assigns one).
   */
  createEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    event: CalendarEvent,
  ): Promise<CalendarOperationResult<CalendarEvent>>

  /**
   * Updates an existing event by id.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param eventId - Event id to update.
   * @param updates - Partial event payload to merge.
   */
  updateEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ): Promise<CalendarOperationResult<CalendarEvent>>

  /**
   * Deletes an event by id.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param eventId - Event id to delete.
   */
  deleteEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    eventId: string,
  ): Promise<CalendarOperationResult<void>>

  /**
   * Computes free slots across one or more calendars.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarIds - One or more provider-specific calendar ids.
   * @param options - Time window and slot duration.
   */
  findFreeSlots(
    credentials: CalendarUserCredentials,
    calendarIds: string[],
    options: FindFreeSlotsOptions,
  ): Promise<CalendarOperationResult<FreeBusyResult>>
}
```

#### `CalendarSummary`

A single calendar in a user's calendar list.

```typescript
interface CalendarSummary {
  /** Provider-specific calendar identifier (opaque). */
  id: string
  /** Human-readable calendar name. */
  summary: string
  /** Optional longer description. */
  description?: string
  /** IANA time zone, e.g. `America/Los_Angeles`. */
  timeZone?: string
  /** Whether this calendar is the user's primary calendar. */
  primary?: boolean
  /** Access role granted to the authenticated user (provider-specific). */
  accessRole?: string
}
```

#### `CalendarUserCredentials`

OAuth token bundle for a single user. Bonds use these to call the
provider's API on behalf of that user, refreshing the access token
automatically when it expires.

```typescript
interface CalendarUserCredentials {
  /** Current access token. */
  accessToken: string
  /** Refresh token used to mint new access tokens. */
  refreshToken: string
  /** Optional epoch-millis timestamp for the access token's expiry. */
  expiresAt?: number
}
```

#### `EventAttendee`

Attendee information attached to a calendar event.

```typescript
interface EventAttendee {
  /** Attendee email address. */
  email: string
  /** Optional display name. */
  displayName?: string
  /** Whether attendance is optional. */
  optional?: boolean
  /** RSVP response status (provider-specific values). */
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | string
}
```

#### `FindFreeSlotsOptions`

Query parameters for the free/busy / free-slot computation.

```typescript
interface FindFreeSlotsOptions {
  /** ISO 8601 lower bound (inclusive). */
  timeMin: string
  /** ISO 8601 upper bound (exclusive). */
  timeMax: string
  /** Required slot duration in minutes. */
  durationMinutes: number
  /** Optional IANA time zone for the returned slot boundaries. */
  timeZone?: string
}
```

#### `FreeBusyResult`

Result of a free/busy lookup plus computed free slots.

```typescript
interface FreeBusyResult {
  /** Aggregated busy blocks across all queried calendars. */
  busy: BusyBlock[]
  /** Computed free slots that fit `durationMinutes`. */
  freeSlots: FreeSlot[]
}
```

#### `FreeSlot`

A free slot of {@link FindFreeSlotsOptions.durationMinutes} length.

```typescript
interface FreeSlot {
  /** ISO 8601 slot start. */
  start: string
  /** ISO 8601 slot end. */
  end: string
}
```

#### `ListEventsOptions`

Query parameters for listing events on a calendar.

```typescript
interface ListEventsOptions {
  /** ISO 8601 lower bound (inclusive). */
  timeMin: string
  /** ISO 8601 upper bound (exclusive). */
  timeMax: string
  /** Maximum number of events to return. Provider-defined cap when omitted. */
  maxResults?: number
  /** When true, recurring events are returned as individual instances. */
  singleEvents?: boolean
  /** Optional sort order — `startTime` is provider-supported by Google. */
  orderBy?: 'startTime' | 'updated'
}
```

### Functions

#### `createEvent(credentials, calendarId, event)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function createEvent(credentials: CalendarUserCredentials, calendarId: string, event: CalendarEvent): Promise<CalendarOperationResult<CalendarEvent>>
```

- `credentials` — The user's OAuth credentials.
- `calendarId` — Provider-specific calendar id.
- `event` — Event payload.

#### `deleteEvent(credentials, calendarId, eventId)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function deleteEvent(credentials: CalendarUserCredentials, calendarId: string, eventId: string): Promise<CalendarOperationResult<void>>
```

- `credentials` — The user's OAuth credentials.
- `calendarId` — Provider-specific calendar id.
- `eventId` — Event id to delete.

#### `findFreeSlots(credentials, calendarIds, options)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function findFreeSlots(credentials: CalendarUserCredentials, calendarIds: string[], options: FindFreeSlotsOptions): Promise<CalendarOperationResult<FreeBusyResult>>
```

- `credentials` — The user's OAuth credentials.
- `calendarIds` — One or more provider-specific calendar ids.
- `options` — Time window and slot duration.

#### `getOptionalProvider()`

Retrieves the bonded calendar provider, returning null if none is bonded.

```typescript
function getOptionalProvider(): CalendarProvider | null
```

**Returns:** The bonded calendar provider, or `null`.

#### `getProvider()`

Retrieves the bonded calendar provider, throwing if none is configured.

```typescript
function getProvider(): CalendarProvider
```

**Returns:** The bonded calendar provider.

#### `hasProvider()`

Checks whether a calendar provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a calendar provider is bonded.

#### `listCalendars(credentials)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function listCalendars(credentials: CalendarUserCredentials): Promise<CalendarOperationResult<CalendarSummary[]>>
```

- `credentials` — The user's OAuth credentials.

**Returns:** The user's calendar list and any refreshed credentials.

#### `listEvents(credentials, calendarId, options)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function listEvents(credentials: CalendarUserCredentials, calendarId: string, options: ListEventsOptions): Promise<CalendarOperationResult<CalendarEvent[]>>
```

- `credentials` — The user's OAuth credentials.
- `calendarId` — Provider-specific calendar id.
- `options` — Time range and paging options.

#### `setProvider(provider)`

Registers a calendar provider as the active singleton. Called by bond
packages (e.g. `@molecule/api-calendar-google`) during app startup.

```typescript
function setProvider(provider: CalendarProvider): void
```

- `provider` — The calendar provider implementation to bond.

#### `updateEvent(credentials, calendarId, eventId, updates)`

Convenience wrapper that delegates to the bonded provider.

```typescript
function updateEvent(credentials: CalendarUserCredentials, calendarId: string, eventId: string, updates: Partial<Omit<CalendarEvent, "id">>): Promise<CalendarOperationResult<CalendarEvent>>
```

- `credentials` — The user's OAuth credentials.
- `calendarId` — Provider-specific calendar id.
- `eventId` — Event id to update.
- `updates` — Partial event payload to merge.

## Available Providers

| Provider | Package |
|----------|---------|
| Google Calendar | `@molecule/api-calendar-google` |
| Microsoft Calendar | `@molecule/api-calendar-microsoft` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
