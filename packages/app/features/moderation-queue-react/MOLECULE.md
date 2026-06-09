# @molecule/app-moderation-queue-react

Moderation queue UI for React.

Renders a list of flagged items with kind icon, content preview,
reason chip, severity color, per-row action buttons (approve /
reject / escalate / mute), and a bulk-select toolbar
(select-all checkbox + apply-to-selected actions).

All user-visible text is i18n'd via the companion locale bond
`@molecule/app-locales-moderation-queue`.

## Quick Start

```tsx
import { ModerationQueue, type ModerationItem } from '@molecule/app-moderation-queue-react'

const items: ModerationItem[] = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: <p>Some flagged comment</p>,
    reason: 'Hate speech',
    reportedBy: '@alice',
    reportedAt: '2 min ago',
    severity: 'high',
  },
]

<ModerationQueue
  items={items}
  onApprove={(id) => api.approve(id)}
  onReject={(id) => api.reject(id)}
  onEscalate={(id) => api.escalate(id)}
  onMute={(id) => api.mute(id)}
  onBulkAction={(action, ids) => api.bulk(action, ids)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-moderation-queue-react
```

## API

### Interfaces

#### `ModerationItem`

One flagged item awaiting moderator review.

```typescript
interface ModerationItem {
  /** Unique id used for selection + action callbacks. */
  id: string
  /** Content kind, drives icon + kind label. */
  kind: ModerationItemKind
  /** Pre-rendered preview slot (usually the offending content). */
  preview: ReactNode
  /** Reason the item was flagged. Free-form string or pre-rendered node. */
  reason: ReactNode
  /** Display name / id of the reporter, optional. */
  reportedBy?: ReactNode
  /** When the report was filed (string or pre-formatted node). */
  reportedAt: ReactNode
  /** Severity — colors the severity chip. */
  severity?: ModerationItemSeverity
}
```

#### `ModerationQueueProps`

Props for the ModerationQueue component.

```typescript
interface ModerationQueueProps {
  /** Flagged items to display. */
  items: ModerationItem[]
  /** Approve the item — content is allowed / kept. */
  onApprove: (id: string) => void
  /** Reject the item — content is removed / hidden. */
  onReject: (id: string) => void
  /** Escalate to a senior moderator / human review. Optional. */
  onEscalate?: (id: string) => void
  /** Mute the reporter / poster. Optional. */
  onMute?: (id: string) => void
  /** Apply an action to the currently-selected ids, if bulk select is in use. */
  onBulkAction?: (action: ModerationBulkAction, ids: string[]) => void
  /** Loading state — replaces the list with a spinner row. */
  loading?: boolean
  /** Empty-state slot rendered when `items` is empty and `loading` is false. */
  emptyState?: ReactNode
  /** Extra classes for the outer container. */
  className?: string
}
```

### Types

#### `ModerationBulkAction`

Bulk action a moderator can apply to selected ids.

```typescript
type ModerationBulkAction = 'approve' | 'reject' | 'escalate' | 'mute'
```

#### `ModerationItemKind`

Kind of content awaiting moderation. Drives the leading icon glyph
and the row's `data-mol-kind` attribute used by tests + AI agents.

```typescript
type ModerationItemKind = 'post' | 'comment' | 'image' | 'message' | 'profile'
```

#### `ModerationItemSeverity`

Severity assigned to a flagged item, used to color the severity chip.
Maps to `ColorVariant`: low→info, medium→warning, high→error.

```typescript
type ModerationItemSeverity = 'low' | 'medium' | 'high'
```

### Functions

#### `ModerationQueue(props)`

Moderation queue — a list of flagged items with kind icon, content
preview, reason chip, severity color, per-row action buttons
(approve / reject / escalate / mute), and a bulk-select toolbar
(select-all checkbox + apply-to-selected action buttons).

All user-visible text comes from i18n keys in
`@molecule/app-locales-moderation-queue`. Styling is driven
exclusively through `getClassMap()`.

```typescript
function ModerationQueue({
  items,
  onApprove,
  onReject,
  onEscalate,
  onMute,
  onBulkAction,
  loading,
  emptyState,
  className,
}: ModerationQueueProps): JSX.Element
```

- `props` — Component props.

**Returns:** A rendered moderation queue.

#### `severityColor(severity)`

Translates a severity to its `ColorVariant`. Exported for tests and
downstream consumers (chips, badges, summary tiles).

```typescript
function severityColor(severity: ModerationItemSeverity | undefined): ColorVariant
```

- `severity` — Severity bucket (`'low'`, `'medium'`, `'high'`) or undefined.

**Returns:** Mapped `ColorVariant`, defaulting to `'info'` when severity is omitted.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-moderation-queue`.
