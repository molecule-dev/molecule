# @molecule/app-status-badge-react

React status-badge and status-pill components.

Both components map a small `StatusKind` union (`success`/`warning`/
`error`/`info`/`neutral`) to ClassMap-driven styling so apps can
restyle by swapping the ClassMap bond rather than rewriting
components.

`<StatusBadge kind children icon? appearance? className?>` — the
contract is `kind` + `children` (there are NO `label`/`color` props).
`appearance='ui'` (default) wraps `<Badge>` from
`@molecule/app-ui-react` and works with any ClassMap bond.
`<StatusPill kind children dot? className?>` adds a small colored
status dot before the label.

## Quick Start

```tsx
import { StatusBadge, StatusPill } from '@molecule/app-status-badge-react'

<StatusBadge kind="success">Open</StatusBadge>

<StatusBadge kind="warning" icon={<span aria-hidden>!</span>}>Pending</StatusBadge>

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

### Interfaces

#### `StatusBadgeProps`

Props for the {@link StatusBadge} component.

```typescript
interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label (usually `t('...')`). */
  children: ReactNode
  /** Optional leading icon (e.g. a dot or check). */
  icon?: ReactNode
  /**
   * Visual appearance variant.
   * - `'ui'` (default) — wraps `<Badge>` from `@molecule/app-ui-react` with
   *   ClassMap-driven coloring. Honors the active ClassMap bond's badge
   *   styling and works with any theme.
   * - `'uppercase-pill'` — a compact uppercase pill that colors itself with
   *   the SAME ClassMap `badge` tokens as the `'ui'` variant
   *   (`cm.badge({ variant })` → real, theme-backed `bg-*` / `text-*`
   *   utilities), then layers `cm.uppercase` + `cm.trackingWide` for the
   *   uppercase treatment. Every kind is visibly colored in both light and
   *   dark themes.
   */
  appearance?: 'ui' | 'uppercase-pill'
  /** Extra classes passed through to the rendered element. */
  className?: string
}
```

#### `StatusPillProps`

Props for the {@link StatusPill} component.

```typescript
interface StatusPillProps {
  /** Semantic kind. */
  kind?: StatusKind
  /** Pill label. */
  children: ReactNode
  /** Render a leading dot indicator. Defaults to true. */
  dot?: boolean
  /** Extra classes. */
  className?: string
}
```

### Types

#### `StatusKind`

Semantic status kind used to select badge color variants.

```typescript
type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'
```

### Functions

#### `StatusBadge(props)`

Semantic status badge — maps status kinds to ClassMap color variants.
Use for "Open / Closed / Pending / Archived" row labels, deal stages,
ticket priorities, etc.

Both appearances resolve their color through the ClassMap `badge` tokens,
so they stay theme-correct: `appearance="ui"` (default) renders the
framework `<Badge>`, and `'uppercase-pill'` renders a compact uppercase
pill with the same per-kind `bg-*` / `text-*` colors.

```typescript
function StatusBadge({
  kind = 'neutral',
  children,
  icon,
  appearance = 'ui',
  className,
}: StatusBadgeProps): JSX.Element
```

- `props` — Component props (see {@link StatusBadgeProps}).

#### `StatusPill(props)`

Rounded status pill with an optional leading colored dot. The pill has
NO background surface of its own — only the dot carries color — so add
a surface via `className` if you need a filled pill. The `neutral` dot
uses `bg-outline`, which is only visible in themes that define an
`outline` color token.

```typescript
function StatusPill({
  kind = 'neutral',
  children,
  dot = true,
  className,
}: StatusPillProps): JSX.Element
```

- `props` — Component props (see {@link StatusPillProps}).

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

- Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
  `getClassMap()` throws before bonding.
- Both `appearance` variants color through the ClassMap `badge` tokens
  (`cm.badge({ variant })` → real `bg-*` / `text-*` theme utilities), so
  the `'uppercase-pill'` variant is visibly colored per kind in every
  theme — it just adds `cm.uppercase` + `cm.trackingWide` on top of the
  same colors the `'ui'` variant uses.
- `<StatusPill>` has no background surface of its own — only the dot
  is colored; add a surface via `className` if you need a filled pill.
  Its `neutral` dot uses `bg-outline`, which also needs a theme
  `outline` color token to be visible.
- Labels are `children` — pass already-translated strings
  (`t('...')`); the components render no text of their own.
