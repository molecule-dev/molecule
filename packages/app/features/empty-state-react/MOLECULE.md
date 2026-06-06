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
  icon={<Icon name="inbox" size={40} />}
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
npm install @molecule/app-empty-state-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
