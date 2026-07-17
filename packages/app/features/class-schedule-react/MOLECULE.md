# @molecule/app-class-schedule-react

Weekly class-schedule grid.

Renders a 7-day × N-hour time grid with absolutely positioned event
tiles inside each day column. Overlapping events on the same weekday
are split into side-by-side lanes. Click handlers fire separately for
event tiles and empty time slots.

Designed for school timetables, virtual classroom schedules, gym /
studio class calendars, conference tracks, and any other weekly
recurring time-of-day grid.

## Quick Start

```tsx
import { ClassSchedule } from '@molecule/app-class-schedule-react'

<ClassSchedule
  events={[
    { id: 'math',  weekday: 1, start: 9 * 60,  end: 10 * 60, title: 'Math 101', subtitle: 'Room 4B' },
    { id: 'eng',   weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English',  subtitle: 'Room 12' },
  ]}
  onEventClick={(e) => console.log('clicked', e.id)}
  onSlotClick={(s) => console.log('empty slot', s)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-class-schedule-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ClassScheduleProps`

Props for the {@link ClassSchedule} weekly timetable component.

```typescript
interface ClassScheduleProps {
  /** Events to render. */
  events: ScheduleEvent[]
  /** First day-of-week (`0` = Sunday, `1` = Monday). Defaults to `1`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Visible hour range as `[startHour, endHour]` in 24-hour clock. Defaults to `[8, 18]`. */
  dayHours?: [number, number]
  /** Pixel height of one hour row. Defaults to `60`. */
  cellHeight?: number
  /** Whether to show Saturday + Sunday columns. Defaults to `true`. */
  showWeekendCols?: boolean
  /** Locale for weekday name formatting (passes through to `Intl.DateTimeFormat`). */
  locale?: string
  /** Called when an event tile is clicked. */
  onEventClick?: (event: ScheduleEvent) => void
  /** Called when an empty grid cell is clicked. */
  onSlotClick?: (slot: ScheduleSlot) => void
  /** Extra classes for the root container. */
  className?: string
}
```

#### `ScheduleEvent`

A single event on the weekly schedule grid.

`start` and `end` are minute offsets from midnight (`0`–`1440`). For
example a class running 09:00–10:30 is `{ start: 540, end: 630 }`.

```typescript
interface ScheduleEvent {
  /** Stable identifier (used as React key + passed to click handlers). */
  id: string
  /** ISO weekday: `0` = Sunday, `1` = Monday … `6` = Saturday. */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Start time in minutes from midnight (e.g. `540` = 09:00). */
  start: number
  /** End time in minutes from midnight (e.g. `630` = 10:30). */
  end: number
  /** Primary label rendered inside the event tile. */
  title: ReactNode
  /** Secondary line — typically room or location. */
  subtitle?: ReactNode
  /** Tertiary line — typically teacher or instructor. */
  meta?: ReactNode
  /** Optional accent color applied as a left border on the tile. */
  accentColor?: string
}
```

#### `ScheduleSlot`

Empty-slot click payload — `weekday` plus the start of the clicked hour
(in minutes from midnight, snapped down to the row).

```typescript
interface ScheduleSlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Hour-of-day boundary in minutes (e.g. `540` for the 09:00 row). */
  start: number
}
```

### Functions

#### `assignLanes(events)`

Lay out events that share a weekday into non-overlapping side-by-side
lanes. Each event gets a `lane` index (0…N) and a `lanes` count for the
group it belongs to so the caller can compute width/left as
`width = (1/lanes) * 100%` / `left = (lane/lanes) * 100%`.

```typescript
function assignLanes(events: E[]): { event: E; lane: number; lanes: number; }[]
```

- `events` — Events occurring on a single weekday.

**Returns:** Array of `{ event, lane, lanes }` records, in input order.

#### `ClassSchedule(props)`

Weekly class-schedule grid. Renders a 7-column (or 5-column when
`showWeekendCols` is `false`) timetable with hour rows down the left
and absolutely positioned event tiles inside each day column. Events
that overlap on the same weekday are split into side-by-side lanes.

Suitable for school timetables, virtual-classroom schedules, gym
class calendars, conference tracks, or any weekly recurring time
grid.

```typescript
function ClassSchedule({
  events,
  weekStartsOn = 1,
  dayHours = [8, 18],
  cellHeight = 60,
  showWeekendCols = true,
  locale,
  onEventClick,
  onSlotClick,
  className,
}: ClassScheduleProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.
- `props.events` — Events to render.
- `props.weekStartsOn` — First day-of-week (`0` Sun, `1` Mon).
- `props.dayHours` — Visible hour range `[start, end]`.
- `props.cellHeight` — Pixel height per hour row.
- `props.showWeekendCols` — Hide Sat + Sun when `false`.
- `props.locale` — Locale for weekday names.
- `props.onEventClick` — Click handler for event tiles.
- `props.onSlotClick` — Click handler for empty grid cells.
- `props.className` — Extra classes for the root container.

**Returns:** The rendered schedule grid.

#### `formatHourLabel(minutes)`

Format a minute-of-day value (0–1440) as `HH:MM` 24-hour clock.

```typescript
function formatHourLabel(minutes: number): string
```

- `minutes` — Minutes from midnight.

**Returns:** Zero-padded `HH:MM` string.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Pair with `@molecule/app-locales-class-schedule` for translations
in 79 languages. All styling routes through `getClassMap()`; all
user-facing text routes through `t()`.

## Translations

Translation strings are provided by `@molecule/app-locales-class-schedule`.
