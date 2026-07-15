# @molecule/app-calendar

Calendar core interface for molecule.dev.

Provides a framework-agnostic contract for calendar widgets with month,
week, day, and agenda views. Bond a provider
(e.g. `@molecule/app-calendar-fullcalendar`) at startup, then use
{@link createCalendar} anywhere.

## Quick Start

```typescript
import { setProvider, createCalendar } from '@molecule/app-calendar'
import { provider } from '@molecule/app-calendar-fullcalendar'

setProvider(provider)

const calendar = createCalendar({
  events: [
    {
      id: '1',
      title: 'Meeting',
      start: new Date('2026-03-28T10:00:00'),
      end: new Date('2026-03-28T11:00:00'),
    },
  ],
  view: 'month',
  onEventClick: (event) => console.log('Clicked:', event.title),
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-calendar @molecule/app-bond
```

## API

### Interfaces

#### `CalendarEvent`

A single calendar event.

```typescript
interface CalendarEvent {
  /** Unique identifier for the event. */
  id: string
  /** Display title for the event (pass through i18n before setting). */
  title: string
  /** Event start date/time. */
  start: Date
  /** Event end date/time. */
  end: Date
  /** Whether this is an all-day event. Defaults to `false`. */
  allDay?: boolean
  /** Display colour for the event (CSS colour string). */
  color?: string
  /** Arbitrary metadata attached to the event. */
  metadata?: Record<string, unknown>
}
```

#### `CalendarInstance`

A live calendar instance exposing query and mutation methods.

```typescript
interface CalendarInstance {
  // -- Navigation ----------------------------------------------------------

  /** Returns the date currently in view. */
  getDate(): Date

  /**
   * Navigates to the given date.
   *
   * @param date - Target date to navigate to.
   */
  setDate(date: Date): void

  /** Navigates to the previous period (month/week/day depending on view). */
  prev(): void

  /** Navigates to the next period (month/week/day depending on view). */
  next(): void

  /** Navigates to today. */
  today(): void

  // -- View ----------------------------------------------------------------

  /** Returns the active view mode. */
  getView(): CalendarView

  /**
   * Switches to the given view mode.
   *
   * @param view - The view to switch to.
   */
  setView(view: CalendarView): void

  // -- Events --------------------------------------------------------------

  /** Returns all events currently loaded. */
  getEvents(): CalendarEvent[]

  /**
   * Replaces the event list.
   *
   * @param events - The new event list.
   */
  setEvents(events: CalendarEvent[]): void

  /**
   * Adds a single event.
   *
   * @param event - The event to add.
   */
  addEvent(event: CalendarEvent): void

  /**
   * Updates an event by id with partial data.
   *
   * @param eventId - The id of the event to update.
   * @param updates - Partial event data to merge.
   */
  updateEvent(eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>): void

  /**
   * Removes an event by id.
   *
   * @param eventId - The id of the event to remove.
   */
  removeEvent(eventId: string): void

  // -- Lifecycle -----------------------------------------------------------

  /** Releases resources held by the calendar instance. */
  destroy(): void
}
```

#### `CalendarOptions`

Configuration for creating a calendar instance.

```typescript
interface CalendarOptions {
  /** Events to display on the calendar. */
  events: CalendarEvent[]
  /** Initial view mode. Defaults to `'month'`. */
  view?: CalendarView
  /** Initial date to display. Defaults to today. */
  date?: Date
  /** Called when an event is clicked. */
  onEventClick?: (event: CalendarEvent) => void
  /** Called when a date cell is clicked. */
  onDateClick?: (date: Date) => void
  /** Called when an event is moved to a new time via drag-and-drop. */
  onEventDrop?: (payload: EventDropPayload) => void
  /** Called when an event is resized. */
  onEventResize?: (payload: EventResizePayload) => void
  /** Whether events can be dragged and resized. Defaults to `false`. */
  editable?: boolean
  /** First day of the week (0 = Sunday, 1 = Monday, …). Defaults to `0`. */
  firstDay?: number
  /** Locale string for date formatting (e.g. `'en-US'`). */
  locale?: string
}
```

#### `CalendarProvider`

Contract that bond packages must implement to provide calendar
functionality.

```typescript
interface CalendarProvider {
  /**
   * Creates a new calendar instance from the given options.
   *
   * @param options - Calendar configuration.
   * @returns A calendar instance.
   */
  createCalendar(options: CalendarOptions): CalendarInstance
}
```

#### `EventDropPayload`

Payload emitted when an event is moved (dragged) to a new time slot.

```typescript
interface EventDropPayload {
  /** The event that was moved. */
  event: CalendarEvent
  /** The new start date/time. */
  newStart: Date
  /** The new end date/time. */
  newEnd: Date
}
```

#### `EventResizePayload`

Payload emitted when an event is resized.

```typescript
interface EventResizePayload {
  /** The event that was resized. */
  event: CalendarEvent
  /** The new start date/time (may be unchanged). */
  newStart: Date
  /** The new end date/time. */
  newEnd: Date
}
```

### Types

#### `CalendarView`

Available calendar view modes.

```typescript
type CalendarView = 'month' | 'week' | 'day' | 'agenda'
```

### Functions

#### `createCalendar(options)`

Creates a calendar instance using the bonded provider.

```typescript
function createCalendar(options: CalendarOptions): CalendarInstance
```

- `options` — Calendar configuration.

**Returns:** A calendar instance.

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

#### `setProvider(provider)`

Registers a calendar provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-calendar-fullcalendar`) during app startup.

```typescript
function setProvider(provider: CalendarProvider): void
```

- `provider` — The calendar provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The calendar renders the seeded events on their correct dates/times.
- [ ] Every view the app exposes (month/week/day/agenda) shows the same
  events consistently when switching.
- [ ] Prev/next/today navigation lands on the right period with its events.
- [ ] Creating an event through the app's flow (slot click or button) shows
  it on the calendar and it persists across a full reload.
- [ ] Clicking an event opens its detail/edit, and an edit (time change, or
  drag-and-drop if supported) sticks after reload.
- [ ] Multi-day and overlapping events render legibly (no clipped or
  stacked-wrong entries).

## Translations

Translation strings are provided by `@molecule/app-locales-calendar`.
