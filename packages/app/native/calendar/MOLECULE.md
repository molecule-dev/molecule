# @molecule/app-calendar

Calendar access interface for molecule.dev

## Type
`native`

## Installation
```bash
npm install @molecule/app-calendar
```

## API

### Interfaces

#### `Calendar`

Device calendar metadata (ID, title, color, read-only flag, account, visibility).

```typescript
interface Calendar {
  /** Calendar ID */
  id: string
  /** Calendar title/name */
  title: string
  /** Calendar color */
  color?: string
  /** Whether calendar is read-only */
  readOnly: boolean
  /** Calendar type */
  type: 'local' | 'subscription' | 'birthday' | 'exchange' | 'google' | 'other'
  /** Account name */
  accountName?: string
  /** Whether calendar is visible */
  visible: boolean
}
```

#### `CalendarCapabilities`

Calendar capabilities

```typescript
interface CalendarCapabilities {
  /** Whether calendar access is supported */
  supported: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether reminders are supported */
  supportsReminders: boolean
  /** Whether recurrence is supported */
  supportsRecurrence: boolean
  /** Whether attendees are supported */
  supportsAttendees: boolean
}
```

#### `CalendarEvent`

Full calendar event with title, dates, location, attendees, reminders, and recurrence rules.

```typescript
interface CalendarEvent {
  /** Event ID */
  id: string
  /** Calendar ID */
  calendarId: string
  /** Event title */
  title: string
  /** Event description */
  description?: string
  /** Event location */
  location?: string
  /** Start date/time (ISO string) */
  startDate: string
  /** End date/time (ISO string) */
  endDate: string
  /** Whether event is all-day */
  allDay: boolean
  /** Event timezone */
  timezone?: string
  /** Event URL */
  url?: string
  /** Event notes */
  notes?: string
  /** Attendees */
  attendees?: EventAttendee[]
  /** Reminders */
  reminders?: EventReminder[]
  /** Recurrence rule */
  recurrence?: RecurrenceRule
  /** Event status */
  status?: 'confirmed' | 'tentative' | 'cancelled'
  /** Event availability */
  availability?: 'busy' | 'free' | 'tentative'
  /** Organizer info */
  organizer?: EventAttendee
}
```

#### `CalendarProvider`

Calendar provider interface

```typescript
interface CalendarProvider {
  /**
   * Get all calendars available on the device.
   * @returns An array of Calendar objects with their metadata.
   */
  getCalendars(): Promise<Calendar[]>

  /**
   * Query calendar events matching the given options.
   * @param options - Query filters (calendar IDs, date range, search text, limit).
   * @returns An array of matching CalendarEvent objects.
   */
  getEvents(options?: EventQueryOptions): Promise<CalendarEvent[]>

  /**
   * Get a single event by ID
   * @param eventId - Event ID
   * @param calendarId - Calendar ID
   */
  getEventById(eventId: string, calendarId: string): Promise<CalendarEvent | null>

  /**
   * Create a new event
   * @param event - Event data
   */
  createEvent(event: EventInput): Promise<CalendarEvent>

  /**
   * Update an existing event
   * @param eventId - Event ID
   * @param event - Updated event data
   */
  updateEvent(eventId: string, event: Partial<EventInput>): Promise<CalendarEvent>

  /**
   * Delete an event
   * @param eventId - Event ID
   * @param calendarId - Calendar ID
   */
  deleteEvent(eventId: string, calendarId: string): Promise<void>

  /**
   * Open native calendar for a date
   * @param date - Date to show
   */
  openCalendar(date?: Date): Promise<void>

  /**
   * Open event in native calendar
   * @param eventId - Event ID
   */
  openEvent(eventId: string): Promise<void>

  /**
   * Get permission status
   */
  getPermissionStatus(): Promise<CalendarPermissionStatus>

  /**
   * Request permission
   */
  requestPermission(): Promise<CalendarPermissionStatus>

  /**
   * Open system settings for calendar permission
   */
  openSettings(): Promise<void>

  /**
   * Get the platform's calendar capabilities.
   * @returns The capabilities indicating which calendar features are supported.
   */
  getCapabilities(): Promise<CalendarCapabilities>
}
```

#### `EventAttendee`

A calendar event attendee with email, name, RSVP status, and organizer/optional flags.

```typescript
interface EventAttendee {
  /** Attendee email */
  email: string
  /** Attendee name */
  name?: string
  /** Attendance status */
  status?: 'pending' | 'accepted' | 'declined' | 'tentative'
  /** Whether attendee is organizer */
  isOrganizer?: boolean
  /** Whether attendee is optional */
  isOptional?: boolean
}
```

#### `EventQueryOptions`

Event query options

```typescript
interface EventQueryOptions {
  /** Calendar IDs to query (all if not specified) */
  calendarIds?: string[]
  /** Start date range (ISO string) */
  startDate?: string
  /** End date range (ISO string) */
  endDate?: string
  /** Search query */
  query?: string
  /** Maximum results */
  limit?: number
}
```

#### `EventReminder`

Event reminder/alarm

```typescript
interface EventReminder {
  /** Minutes before event to trigger reminder */
  minutes: number
  /** Reminder method */
  method?: 'alert' | 'email' | 'sms'
}
```

#### `RecurrenceRule`

Recurrence rule

```typescript
interface RecurrenceRule {
  /** Recurrence frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** Interval between occurrences */
  interval?: number
  /** End date (ISO string) */
  endDate?: string
  /** Number of occurrences */
  count?: number
  /** Days of week (0-6, Sunday-Saturday) */
  daysOfWeek?: number[]
  /** Days of month (1-31) */
  daysOfMonth?: number[]
  /** Months (1-12) */
  months?: number[]
}
```

### Types

#### `CalendarPermissionStatus`

Permission status

```typescript
type CalendarPermissionStatus = 'granted' | 'denied' | 'limited' | 'prompt' | 'unsupported'
```

#### `EventInput`

Event input for creation/update

```typescript
type EventInput = Omit<CalendarEvent, 'id'> & { id?: string }
```

### Functions

#### `createEvent(event)`

Create a new calendar event.

```typescript
function createEvent(event: EventInput): Promise<CalendarEvent>
```

- `event` — The event data to create (title, dates, attendees, etc.).

**Returns:** The created CalendarEvent with its assigned ID.

#### `deleteEvent(eventId, calendarId)`

Delete a calendar event.

```typescript
function deleteEvent(eventId: string, calendarId: string): Promise<void>
```

- `eventId` — The ID of the event to delete.
- `calendarId` — The calendar ID containing the event.

**Returns:** A promise that resolves when the event is deleted.

#### `eventsOverlap(event1, event2)`

Check if two calendar events overlap in time.

```typescript
function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean
```

- `event1` — The first event to compare.
- `event2` — The second event to compare.

**Returns:** Whether the two events have overlapping time ranges.

#### `formatEventTimeRange(event, locale)`

Format an event's time range as a human-readable string.
Handles all-day events, same-day events, and multi-day events differently.

```typescript
function formatEventTimeRange(event: CalendarEvent, locale?: string): string
```

- `event` — The calendar event to format.
- `locale` — The locale code for date/time formatting (default: 'en-US').

**Returns:** A formatted time range string (e.g., "9:00 AM - 10:00 AM" or "Mon, Jan 5").

#### `getCalendars()`

Get all calendars available on the device.

```typescript
function getCalendars(): Promise<Calendar[]>
```

**Returns:** An array of Calendar objects with their metadata.

#### `getCapabilities()`

Get the platform's calendar capabilities.

```typescript
function getCapabilities(): Promise<CalendarCapabilities>
```

**Returns:** The capabilities indicating which calendar features are supported.

#### `getEventById(eventId, calendarId)`

Get a single event by its ID.

```typescript
function getEventById(eventId: string, calendarId: string): Promise<CalendarEvent | null>
```

- `eventId` — The event ID to look up.
- `calendarId` — The calendar ID containing the event.

**Returns:** The matching CalendarEvent, or null if not found.

#### `getEventDuration(event)`

Get the duration of a calendar event in minutes.

```typescript
function getEventDuration(event: CalendarEvent): number
```

- `event` — The calendar event to measure.

**Returns:** The event duration in minutes, rounded to the nearest integer.

#### `getEvents(options)`

Query calendar events matching the given options.

```typescript
function getEvents(options?: EventQueryOptions): Promise<CalendarEvent[]>
```

- `options` — Query filters (calendar IDs, date range, search text, limit).

**Returns:** An array of matching CalendarEvent objects.

#### `getPermissionStatus()`

Get the current calendar permission status.

```typescript
function getPermissionStatus(): Promise<CalendarPermissionStatus>
```

**Returns:** The permission status: 'granted', 'denied', 'limited', 'prompt', or 'unsupported'.

#### `getProvider()`

Get the current calendar provider.

```typescript
function getProvider(): CalendarProvider
```

**Returns:** The active CalendarProvider instance.

#### `hasProvider()`

Check if a calendar provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a CalendarProvider has been bonded.

#### `openCalendar(date)`

Open the native calendar app, optionally showing a specific date.

```typescript
function openCalendar(date?: Date): Promise<void>
```

- `date` — The date to navigate to (defaults to today).

**Returns:** A promise that resolves when the calendar app is opened.

#### `openEvent(eventId)`

Open a specific event in the native calendar app.

```typescript
function openEvent(eventId: string): Promise<void>
```

- `eventId` — The ID of the event to open.

**Returns:** A promise that resolves when the event is opened.

#### `openSettings()`

Open the system settings screen for calendar permissions.

```typescript
function openSettings(): Promise<void>
```

**Returns:** A promise that resolves when the settings screen is opened.

#### `parseQuickEvent(text, calendarId)`

Parse a text string into a quick calendar event. Uses basic keyword matching
for time references. Returns null if no title can be extracted.

```typescript
function parseQuickEvent(text: string, calendarId: string): EventInput | null
```

- `text` — Natural language event text (e.g., "Meeting tomorrow at 3pm").
- `calendarId` — The calendar ID to assign the event to.

**Returns:** An EventInput for a 1-hour event starting at the next hour, or null if parsing fails.

#### `requestPermission()`

Request calendar permissions from the user.

```typescript
function requestPermission(): Promise<CalendarPermissionStatus>
```

**Returns:** The resulting permission status after the request.

#### `setProvider(provider)`

Set the calendar provider.

```typescript
function setProvider(provider: CalendarProvider): void
```

- `provider` — CalendarProvider implementation to register.

#### `updateEvent(eventId, event)`

Update an existing calendar event.

```typescript
function updateEvent(eventId: string, event: Partial<EventInput>): Promise<CalendarEvent>
```

- `eventId` — The ID of the event to update.
- `event` — The partial event data to merge with the existing event.

**Returns:** The updated CalendarEvent.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-calendar`.
