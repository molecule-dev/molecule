# @molecule/app-empty-state-react

React empty-state and CTA-card primitives.

Exports:
- `<EmptyState>` — centred icon + title + description + action for lists,
  feeds, boards, or tables that have no rows to render yet.
- `<CtaCard>` — horizontal or vertical promotional card for "next-step"
  actions inside a page body.

Both components accept a `className` prop so apps can layer per-brand
accent chrome (dashed borders, gradient CTAs, tinted backgrounds) on
top of the structural layout.

## Quick Start

```tsx
import { EmptyState, CtaCard } from '@molecule/app-empty-state-react'

// Centred empty-state for a list with no items
<EmptyState
  icon={<Icon name="mail" size={40} />}
  title="No messages yet"
  description="When you receive messages they will appear here."
  action={<Button onClick={() => openCompose()}>Send one</Button>}
/>

// Inline promotional card
<CtaCard
  title="Connect your bank"
  description="Link an account to start tracking transactions."
  action={<Button variant="solid">Connect</Button>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-empty-state-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `CtaCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

A "soft sell" card used to promote a next-step action inside a page
body (e.g., "Connect your bank", "Invite teammates").

Differs from `<EmptyState>` in being positioned in a list of cards
rather than filling the void. Supports a horizontal layout with the
media slot beside the text.

```typescript
function CtaCard({
  eyebrow,
  title,
  description,
  action,
  media,
  layout = 'vertical',
  dataMolId,
  className,
}: CtaCardProps): JSX.Element
```

- `root0` — *
- `root0` — .eyebrow
- `root0` — .title
- `root0` — .description
- `root0` — .action
- `root0` — .media
- `root0` — .layout
- `root0` — .dataMolId
- `root0` — .className

#### `EmptyState(root0, root0, root0, root0, root0, root0, root0, root0)`

Generic centred empty-state panel for lists, feeds, boards, and tables.

Renders a vertical stack of [icon, title, description, action]. Typography
and spacing come from the wired ClassMap; per-app accent chrome (dashed
borders, tinted backgrounds, gradient CTAs) is passed via `className`
on the outer element.

```typescript
function EmptyState({
  icon,
  title,
  description,
  action,
  dataMolId,
  className,
  iconWrapperClassName,
}: EmptyStateProps): JSX.Element
```

- `root0` — *
- `root0` — .icon
- `root0` — .title
- `root0` — .description
- `root0` — .action
- `root0` — .dataMolId
- `root0` — .className
- `root0` — .iconWrapperClassName

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
