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
import { Button, Icon } from '@molecule/app-ui-react'

// Centred empty-state for a list with no items
<EmptyState
  icon={<Icon name="mail" size={40} />}
  title={t('messages.empty.title', {}, { defaultValue: 'No messages yet' })}
  description={t('messages.empty.description', {}, { defaultValue: 'When you receive messages they will appear here.' })}
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

### Interfaces

#### `CtaCardProps`

```typescript
interface CtaCardProps {
  /** Optional small eyebrow line above the title. */
  eyebrow?: ReactNode
  /** Primary heading. */
  title: ReactNode
  /** Supporting copy. */
  description?: ReactNode
  /** Primary call-to-action. */
  action?: ReactNode
  /** Optional visual / illustration rendered at the top or side. */
  media?: ReactNode
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}
```

#### `EmptyStateProps`

```typescript
interface EmptyStateProps {
  /** Visual — typically an `<Icon>` or `<img>`. Rendered in a circular badge above the heading. */
  icon?: ReactNode
  /** Primary heading text (usually `t('...')`). */
  title: ReactNode
  /** Supporting description shown below the heading. */
  description?: ReactNode
  /** Action area — typically a `<Button>` or `<Link>`. */
  action?: ReactNode
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string
}
```

### Functions

#### `CtaCard(props)`

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

- `props` — Component props (see {@link CtaCardProps}).

#### `EmptyState(props)`

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

- `props` — Component props (see {@link EmptyStateProps}).

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

- **Name collision:** `@molecule/app-ui-react` also exports an
  `EmptyState` (the ClassMap-token variant driven by `cm.emptyState*`).
  Use THAT one for plain framework-styled empty states; use THIS
  package when you want the circular icon badge
  (`iconWrapperClassName`), per-brand chrome via `className`, a
  `dataMolId`, or the companion `<CtaCard>`. If you import both
  packages, alias one import to avoid the clash.
- All text arrives via props — translate with your `t()` calls; this
  package has no locale bond of its own.
- Styling resolves through `getClassMap()` — requires a wired ClassMap
  bond (standard molecule app setup).
