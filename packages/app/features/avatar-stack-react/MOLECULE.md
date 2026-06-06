# @molecule/app-avatar-stack-react

React avatar-stack and user-chip components.

Exports:
- `<AvatarStack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
- `<UserChip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.

Both render on top of `<Avatar>` from `@molecule/app-ui-react`, so
avatar fallbacks (text initials, color hash) come from there.

## Quick Start

```tsx
import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-react'

// Overlapping avatar row for assignees
<AvatarStack
  people={[
    { name: 'Alice Kim', src: '/avatars/alice.jpg' },
    { name: 'Bob Lee' },
    { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
  ]}
  max={3}
  size="sm"
/>

// Single user row in a dropdown
<UserChip name="Alice Kim" src="/avatars/alice.jpg" subtitle="Admin" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-avatar-stack-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
