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
npm install @molecule/app-class-schedule-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

Pair with `@molecule/app-locales-class-schedule` for translations
in 79 languages. All styling routes through `getClassMap()`; all
user-facing text routes through `t()`.

## Translations

Translation strings are provided by `@molecule/app-locales-class-schedule`.
