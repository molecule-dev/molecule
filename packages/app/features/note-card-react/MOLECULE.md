# @molecule/app-note-card-react

Sticky-note style card.

Exports `<NoteCard>`.

## Quick Start

```tsx
import { NoteCard } from '@molecule/app-note-card-react'

<NoteCard
  title="Meeting notes"
  body="Follow up with design team on the new dashboard layout."
  color="#fef9c3"
  pinned
  modifiedAt="Jun 5, 2026"
  onClick={() => openNote(note.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-note-card-react
```

## API

### Functions

#### `NoteCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .body
- `root0` — .color
- `root0` — .pinned
- `root0` — .modifiedAt
- `root0` — .actions
- `root0` — .onClick
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
