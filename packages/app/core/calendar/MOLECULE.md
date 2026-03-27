# @molecule/app-calendar

Calendar core interface for molecule.dev.

Provides a framework-agnostic contract for calendar widgets with month, week,
day, and agenda views. Supports drag-and-drop event editing, event CRUD
operations, and view navigation.

## Bond Pattern

```typescript
import { setProvider, createCalendar } from '@molecule/app-calendar'
import { provider } from '@molecule/app-calendar-fullcalendar'

// Wire at startup
setProvider(provider)

// Use anywhere
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

## Available Providers

- `@molecule/app-calendar-fullcalendar` — FullCalendar-based provider
