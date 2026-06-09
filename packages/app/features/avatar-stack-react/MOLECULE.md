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

## API

### Interfaces

#### `AvatarStackPerson`

Represents a single person entry rendered inside an AvatarStack.

```typescript
interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}
```

### Functions

#### `AvatarStack(root0, root0, root0, root0, root0)`

Horizontal stack of overlapping avatars (assignees, attendees, etc.).

Renders up to `max` avatars; any remaining are summarised as `+N` in a
trailing chip.

```typescript
function AvatarStack({
  people,
  max = 4,
  size = 'sm',
  className,
}: AvatarStackProps): JSX.Element
```

- `root0` — *
- `root0` — .people
- `root0` — .max
- `root0` — .size
- `root0` — .className

#### `UserChip(root0, root0, root0, root0, root0, root0, root0)`

Avatar + name + optional subtitle row — useful in dropdowns, mention
pickers, assignment popovers, and row-level user references.

```typescript
function UserChip({
  name,
  src,
  subtitle,
  trailing,
  size = 'sm',
  className,
}: UserChipProps): JSX.Element
```

- `root0` — *
- `root0` — .name
- `root0` — .src
- `root0` — .subtitle
- `root0` — .trailing
- `root0` — .size
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
