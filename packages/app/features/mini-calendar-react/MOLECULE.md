# @molecule/app-mini-calendar-react

React mini month-view calendar.

Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
Intl-localized weekday + month names, controlled-optional `selected` +
`month` props, and an `isDisabled` day predicate.

## Quick Start

```tsx
import { MiniCalendar } from '@molecule/app-mini-calendar-react'

<MiniCalendar
  selected={new Date('2026-06-15')}
  onSelect={(date) => console.log(date.toISOString())}
  locale="en-US"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-mini-calendar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `MiniCalendarProps`

```typescript
interface MiniCalendarProps {
  /** Controlled selected date (ISO yyyy-mm-dd or Date). */
  selected?: Date | string
  /** Called when the user picks a day. */
  onSelect?: (date: Date) => void
  /** Controlled visible month. If omitted the component tracks its own. */
  month?: Date
  /** Called when the user navigates months. */
  onMonthChange?: (date: Date) => void
  /** Locale for weekday + month name formatting. */
  locale?: string
  /** Optional day-disabled predicate. */
  isDisabled?: (date: Date) => boolean
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `MiniCalendar(props)`

Compact month-view calendar. Supports controlled `selected` + `month`
props or runs uncontrolled. Weekday / month names come from
`Intl.DateTimeFormat` so locales render correctly without extra data.

```typescript
function MiniCalendar({
  selected,
  onSelect,
  month: monthProp,
  onMonthChange,
  locale,
  isDisabled,
  className,
}: MiniCalendarProps): JSX.Element
```

- `props` — Component props (see {@link MiniCalendarProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
`getClassMap()` throws before wiring, and the prev/next buttons come
from `@molecule/app-ui-react`.

Weekday and month names localize automatically through
`Intl.DateTimeFormat(locale)` — no locale bond involved. The prev/next
button aria-labels are currently English-only.

When `month` is supplied the visible month is fully controlled —
wire `onMonthChange` too or the arrows will appear dead. The grid
always renders 6 weeks; days outside the visible month render dimmed
and remain clickable unless `isDisabled` filters them.
