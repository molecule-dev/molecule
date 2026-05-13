# @molecule/app-activity-timeline-react

`@molecule/app-activity-timeline-react` — vertical timeline of events
(calls, emails, meetings, deal stages, shipment hops, milestones).

Sister package to `@molecule/app-activity-feed-react` (which is a
flat avatar-prose list). Use this one when the chronological
sequencing of events is the main affordance — connector line + dots
make ordering obvious at a glance.

Extracted from the crm and employee-onboarding flagships.

## Quick Start

```tsx
import { ActivityTimeline } from '@molecule/app-activity-timeline-react'
import { Link } from 'react-router-dom'

<ActivityTimeline
  events={activities.map((a) => ({
    id: a.id, kind: a.type, title: a.subject,
    description: a.description, meta: a.due_date,
  }))}
  toneByKind={{
    call: { icon: 'call', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
    email: { icon: 'mail', dotClass: 'bg-secondary' },
  }}
  rowWrapper={(event, children) => <Link to={`/activities/${event.id}`}>{children}</Link>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-activity-timeline-react
```

## API

### Interfaces

#### `TimelineEventData`

Single event displayed on the timeline. The kind drives the icon and
dot colour via the consumer-supplied `iconForKind` map.

```typescript
interface TimelineEventData {
  id: string
  kind: string
  title: ReactNode
  description?: ReactNode
  /** ISO timestamp or pre-formatted label. */
  occurredAt?: string
  /** Pre-formatted right-aligned label (e.g. "Mar 5", "2h ago"). */
  meta?: ReactNode
  /** Optional href — when set, the row renders as a link. */
  href?: string
  /** Extra footer content (badges, before/after chips, etc.). */
  footer?: ReactNode
}
```

#### `TimelineKindTone`

Visual treatment for a particular event kind.

```typescript
interface TimelineKindTone {
  /** Material-symbols icon name. */
  icon: string
  /** ClassMap-class string applied to the dot background. */
  dotClass?: string
  /** ClassMap-class string applied to the icon. */
  iconClass?: string
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
