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
npm install @molecule/app-mini-calendar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
