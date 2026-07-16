# @molecule/app-note-card-react

Sticky-note style card.

Exports `<NoteCard>`.

## Quick Start

```tsx
import { NoteCard } from '@molecule/app-note-card-react'

declare function openNote(): void

<NoteCard
  title="Meeting notes"
  body="Follow up with design team on the new dashboard layout."
  color="#fef9c3"
  pinned
  modifiedAt="Jun 5, 2026"
  onClick={openNote}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-note-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `NoteCardProps`

```typescript
interface NoteCardProps {
  /** Note title. */
  title?: ReactNode
  /** Note body text. */
  body: ReactNode
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display. */
  modifiedAt?: ReactNode
  /** Optional right-side actions (edit, archive, delete). */
  actions?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `NoteCard(props)`

Sticky-note style card with optional color tint, pinned indicator,
and bottom-right actions. Use for note-taking apps, digital
post-its, dashboard quick-notes.

```typescript
function NoteCard({
  title,
  body,
  color,
  pinned,
  modifiedAt,
  actions,
  onClick,
  className,
}: NoteCardProps): JSX.Element
```

- `props` — Component props (see {@link NoteCardProps}).

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

Requires a wired ClassMap bond — `getClassMap()` throws before wiring.

The card intentionally keeps a paper-sticky-note look in BOTH themes:
its text color is fixed near-black, so `color` must be a LIGHT pastel
(`#fef9c3`, `#dbeafe`, `#dcfce7`, ...) — a dark `color` value makes
the body unreadable. The card does not re-tint with the app theme.

`onClick` makes the whole card clickable but renders no button
semantics — supply your own focus/keyboard affordance (or wrap the
card in a button/link) when click-to-open matters for a11y.
