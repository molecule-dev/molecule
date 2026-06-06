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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
