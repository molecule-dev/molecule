# @molecule/app-calendar-fullcalendar

FullCalendar-style provider for the molecule calendar interface.

Implements `CalendarProvider` from `@molecule/app-calendar` as a HEADLESS
in-memory state manager modeled on FullCalendar's API shape — it does NOT
depend on or load the FullCalendar library, and it renders nothing. Your
app builds the grid from `getEvents()` / `getDate()` / `getView()` and
drives navigation/mutations through the instance.

## Quick Start

```typescript
import { provider } from '@molecule/app-calendar-fullcalendar'
import { setProvider } from '@molecule/app-calendar'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-calendar-fullcalendar @molecule/app-calendar
```

## API

### Interfaces

#### `FullCalendarConfig`

Configuration options for the FullCalendar calendar provider.

```typescript
interface FullCalendarConfig {
  /**
   * Default view to use when no view is specified in options.
   * Defaults to `'month'`.
   */
  defaultView?: CalendarView

  /**
   * First day of the week (0 = Sunday, 1 = Monday, …).
   * Defaults to `0`.
   */
  defaultFirstDay?: number

  /**
   * Whether a dragged or resized event may overlap another event.
   *
   * Mirrors FullCalendar's `eventOverlap` option. When `false`, a drag or
   * resize that would collide with another event is rejected (the event
   * stays put and no `onEventDrop` / `onEventResize` callback fires).
   * Programmatic `addEvent` / `setEvents` / `updateEvent` are never blocked.
   * Defaults to `true`.
   */
  allowEventOverlap?: boolean

  /**
   * Minimum event duration in minutes enforced when an event is resized.
   *
   * A resize that would shrink an event below this floor is clamped: the
   * start is preserved and the end is pushed out so the event stays at least
   * `minEventDurationMinutes` long. Defaults to `30`.
   */
  minEventDurationMinutes?: number
}
```

#### `FullCalendarInstance`

Extended calendar instance with FullCalendar-specific internal methods.

Framework bindings use the `_` prefixed methods to sync DOM events
from the actual FullCalendar library instance to the provider state.

```typescript
interface FullCalendarInstance extends CalendarInstance {
  /**
   * Called by framework bindings when the user clicks an event in the DOM.
   *
   * @param eventId - The id of the clicked event.
   */
  _handleEventClick(eventId: string): void

  /**
   * Called by framework bindings when the user clicks a date cell in the DOM.
   *
   * @param date - The clicked date.
   */
  _handleDateClick(date: Date): void

  /**
   * Called by framework bindings when an event is dragged to a new time.
   *
   * @param eventId - The id of the moved event.
   * @param newStart - The new start date/time.
   * @param newEnd - The new end date/time.
   */
  _handleEventDrop(eventId: string, newStart: Date, newEnd: Date): void

  /**
   * Called by framework bindings when an event is resized.
   *
   * @param eventId - The id of the resized event.
   * @param newStart - The new start date/time.
   * @param newEnd - The new end date/time.
   */
  _handleEventResize(eventId: string, newStart: Date, newEnd: Date): void

  /**
   * Returns the provider configuration.
   *
   * @returns The FullCalendar configuration.
   */
  _getConfig(): FullCalendarConfig

  /**
   * Returns whether the calendar is editable.
   *
   * @returns `true` if editing is enabled.
   */
  _isEditable(): boolean

  /**
   * Returns the first day of the week.
   *
   * @returns The first day (0 = Sunday, 1 = Monday, …).
   */
  _getFirstDay(): number

  /**
   * Returns the locale string.
   *
   * @returns The locale string, or `undefined` if not set.
   */
  _getLocale(): string | undefined
}
```

### Functions

#### `createFullCalendarProvider(config)`

Creates a FullCalendar-style calendar provider.

```typescript
function createFullCalendarProvider(config?: FullCalendarConfig): CalendarProvider
```

- `config` — Optional FullCalendar-specific configuration.

**Returns:** A `CalendarProvider` backed by FullCalendar-style state management.

### Constants

#### `provider`

Default FullCalendar provider instance.

```typescript
const provider: CalendarProvider
```

## Core Interface
Implements `@molecule/app-calendar` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-calendar'
import { provider } from '@molecule/app-calendar-fullcalendar'

export function setupCalendarFullcalendar(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-calendar` >=1.0.0

### Runtime Dependencies

- `@molecule/app-calendar`

This provider honours FullCalendar's interaction rules on drag/resize.
`allowEventOverlap` (default `true`) mirrors FullCalendar's `eventOverlap`:
when `false`, a drag or resize that would collide with another event is
rejected (the event stays put, no `onEventDrop` / `onEventResize` fires).
`minEventDurationMinutes` (default `30`) clamps a resize so an event is
never shorter than the configured minimum — the start is kept and the end
pushed out. Both rules apply ONLY to the interactive `_handleEventDrop` /
`_handleEventResize` paths; programmatic `addEvent` / `setEvents` /
`updateEvent` are never blocked.

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
