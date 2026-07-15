# @molecule/app-mini-calendar-react

React mini month-view calendar.

Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
Intl-localized weekday + month names, controlled-optional `selected` +
`month` props.

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

### Functions

#### `MiniCalendar(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .selected
- `root0` — .onSelect
- `root0` — .month
- `root0` — .onMonthChange
- `root0` — .locale
- `root0` — .isDisabled
- `root0` — .className

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
