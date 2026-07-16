# @molecule/app-integration-card-react

React integration / connection card.

Exports:
- `<IntegrationCard>` — icon + title + description + status label + action button.
  Props: `icon?`, `title`, `description?`, `status?` (default `'disconnected'`),
  `action?` (`{ label, onClick?, href?, loading?, disabled? }`), `variant?`
  (`'card'` default | `'cta'` gradient promo), `className?`, `dataMolId?`.
- `IntegrationStatus` type (`'connected' | 'disconnected' | 'pending' | 'error'`).

Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.

## Quick Start

```tsx
import { IntegrationCard } from '@molecule/app-integration-card-react'

<IntegrationCard
  title="Slack"
  description="Send notifications to your team channels."
  status="disconnected"
  action={{ label: 'Connect', onClick: () => { window.location.href = '/oauth/slack' } }}
  dataMolId="slack-integration-card"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-integration-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `IntegrationCardProps`

```typescript
interface IntegrationCardProps {
  /** Leading icon / logo for the integration. */
  icon?: ReactNode
  /** Integration title. */
  title: ReactNode
  /** Supporting description. */
  description?: ReactNode
  /** Current connection status. */
  status?: IntegrationStatus
  /** Action button configuration. */
  action?: {
    label: ReactNode
    onClick?: () => void
    href?: string
    loading?: boolean
    disabled?: boolean
  }
  /** `'card'` default, `'cta'` for premium gradient-tinted promos. */
  variant?: 'card' | 'cta'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Types

#### `IntegrationStatus`

Connection status for an integration.

```typescript
type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'
```

### Functions

#### `IntegrationCard(props)`

Card for an integration / external connection (Slack, Stripe, Google
Drive, bank-link CTAs, etc.). Shows icon + title + description +
status + action.

```typescript
function IntegrationCard({
  icon,
  title,
  description,
  status = 'disconnected',
  action,
  variant = 'card',
  className,
  dataMolId,
}: IntegrationCardProps): JSX.Element
```

- `props` — Component props (see {@link IntegrationCardProps}).

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

- The status label text ('Connected', 'Connecting…', 'Error', 'Not connected') is
  hardcoded English — there is no i18n hook and no override prop. In a non-English
  app, render your own translated status next to the card (or hide it via CSS)
  until the package routes these through `t()`.
- `variant="cta"` paints an inline `linear-gradient` background over the Card using
  `var(--color-primary)` (falls back to a fixed blue when the theme token is
  missing). Inline styles beat ClassMap classes, so this overrides the themed card
  surface; check text contrast against your primary color before using it.
- `action.href` renders an anchor wrapping the Button and ignores `action.loading`;
  prefer `action.onClick` for anything that needs a loading state. While
  `action.loading` is true the button label is replaced by an ellipsis glyph.
- Styling resolves through `getClassMap()` — wire a ClassMap bond (e.g.
  `@molecule/app-ui-tailwind`) before rendering.
