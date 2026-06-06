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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
