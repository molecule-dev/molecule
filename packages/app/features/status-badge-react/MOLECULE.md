# @molecule/app-status-badge-react

React status-badge and status-pill components.

Both components map a small `StatusKind` union (`success`/`warning`/
`error`/`info`/`neutral`) to ClassMap-driven styling so apps can
restyle by swapping the ClassMap bond rather than rewriting
components.

## Quick Start

```tsx
import { StatusBadge, StatusPill } from '@molecule/app-status-badge-react'

// Semantic badge in a table row
<StatusBadge kind="success">Open</StatusBadge>

// Polished-flagship uppercase pill style
<StatusBadge kind="warning" appearance="uppercase-pill">Pending</StatusBadge>

// Pill with colored dot indicator
<StatusPill kind="error">Overdue</StatusPill>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-status-badge-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Types

#### `StatusKind`

Semantic status kind used to select badge color variants.

```typescript
type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'
```

### Functions

#### `StatusBadge(root0, root0, root0, root0, root0, root0)`

Semantic status badge — maps status kinds to ClassMap color variants.
Use for "Open / Closed / Pending / Archived" row labels, deal stages,
ticket priorities, etc.

The `appearance` prop selects between the ClassMap-helper variant
(`'ui'`, default) and the polished-flagship inline pattern
(`'uppercase-pill'`). Pass `appearance="uppercase-pill"` in dashboard
tables and list rows to match crm/helpdesk-ticketing/online-store.

```typescript
function StatusBadge({
  kind = 'neutral',
  children,
  icon,
  appearance = 'ui',
  className,
}: StatusBadgeProps): JSX.Element
```

- `root0` — *
- `root0` — .kind
- `root0` — .children
- `root0` — .icon
- `root0` — .appearance
- `root0` — .className

#### `StatusPill(root0, root0, root0, root0, root0)`

Rounded status pill with an optional leading colored dot.
Taller and more visually distinct than `<StatusBadge>` — useful as
a primary row indicator in tables and cards.

```typescript
function StatusPill({
  kind = 'neutral',
  children,
  dot = true,
  className,
}: StatusPillProps): JSX.Element
```

- `root0` — *
- `root0` — .kind
- `root0` — .children
- `root0` — .dot
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
