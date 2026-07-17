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
npm install @molecule/app-avatar-stack-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `AvatarStackProps`

```typescript
interface AvatarStackProps {
  /** People to render. */
  people: AvatarStackPerson[]
  /** Maximum visible avatars. Remaining are summarised in an "overflow" chip. */
  max?: number
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer stack. */
  className?: string
}
```

#### `UserChipProps`

```typescript
interface UserChipProps {
  /** Display name. */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle). */
  subtitle?: ReactNode
  /** Optional trailing content (action button, status dot, etc.). */
  trailing?: ReactNode
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}
```

### Functions

#### `AvatarStack(props)`

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

- `props` — Component props (see {@link AvatarStackProps}).

#### `UserChip(props)`

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

- `props` — Component props (see {@link UserChipProps}).

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

The overflow chip announces "+N more" — this is the only user-visible
text (currently English-only). Avatar fallbacks (initials, color hash)
come from `<Avatar>` in `@molecule/app-ui-react`. The overlap is an
inline negative left margin (`marginLeft: '-0.5rem'`), not a ClassMap
class: the abstract spacing scale is non-negative, so a negative margin
is one of the sanctioned inline-style cases.
