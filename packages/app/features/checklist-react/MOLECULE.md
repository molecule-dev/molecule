# @molecule/app-checklist-react

Onboarding checklist with checkboxes and overall progress bar.

Exports `<Checklist>` and `ChecklistItem` type.

## Quick Start

```tsx
import { Checklist } from '@molecule/app-checklist-react'

<Checklist
  title="Getting started"
  items={[
    { id: 'profile', label: 'Complete your profile', completed: true },
    { id: 'invite', label: 'Invite a team member', completed: false },
    { id: 'project', label: 'Create your first project', completed: false },
  ]}
  onToggle={(id, next) => updateItem(id, next)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-checklist-react
```

## API

### Interfaces

#### `ChecklistItem`

A single item in the checklist, tracking its label, description, and completion state.

```typescript
interface ChecklistItem {
  id: string
  label: ReactNode
  /** Optional description / hint shown under the label. */
  description?: ReactNode
  /** Completion state. */
  completed: boolean
  /** When true, the item is rendered disabled and uncheckable. */
  disabled?: boolean
}
```

### Functions

#### `Checklist(root0, root0, root0, root0, root0, root0)`

Onboarding-style checklist with checkboxes, optional descriptions,
and an overall progress bar derived from `items`.

```typescript
function Checklist({
  items,
  onToggle,
  showProgress = true,
  title,
  className,
}: ChecklistProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .onToggle
- `root0` — .showProgress
- `root0` — .title
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
