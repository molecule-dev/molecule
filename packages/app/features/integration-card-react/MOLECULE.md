# @molecule/app-integration-card-react

React integration / connection card.

Exports:
- `<IntegrationCard>` — icon + title + description + status + action button.
- `IntegrationStatus` type (`'connected' | 'disconnected' | 'pending' | 'error'`).

Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.

## Quick Start

```tsx
import { IntegrationCard } from '@molecule/app-integration-card-react'

<IntegrationCard
  title="Slack"
  description="Send notifications to your team channels."
  status="disconnected"
  action={{ label: 'Connect', onClick: () => openSlackOAuth() }}
  dataMolId="slack-integration-card"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-integration-card-react
```

## API

### Types

#### `IntegrationStatus`

Connection status for an integration.

```typescript
type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'
```

### Functions

#### `IntegrationCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .icon
- `root0` — .title
- `root0` — .description
- `root0` — .status
- `root0` — .action
- `root0` — .variant
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
