# @molecule/app-calendar-fullcalendar

FullCalendar provider for the molecule calendar interface.

Implements `CalendarProvider` from `@molecule/app-calendar` using
a FullCalendar-style state management approach. Framework bindings
connect the headless state to the actual FullCalendar DOM library.

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
npm install @molecule/app-calendar-fullcalendar
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
   * Whether to allow events to overlap by default.
   * Defaults to `true`.
   */
  allowEventOverlap?: boolean

  /**
   * Minimum event duration in minutes for new/resized events.
   * Defaults to `30`.
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-calendar` >=1.0.0
