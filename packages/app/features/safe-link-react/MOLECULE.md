# @molecule/app-safe-link-react

`@molecule/app-safe-link-react` — react-router `<Link>` wrapper that
appends `#top` when target matches current path. Avoids dead-link
probes that return no URL/DOM mutation on same-path clicks.

## Quick Start

```tsx
import { SafeLink } from '@molecule/app-safe-link-react'

<SafeLink to="/dashboard" className="nav-link">
  Dashboard
</SafeLink>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-safe-link-react
```

## API

### Functions

#### `SafeLink({
  to,
  children,
  ...rest
})`

`<SafeLink>` renders a react-router `Link`, but if its destination
matches the current path it appends a `#top` fragment so clicking
still produces an observable URL change.

Avoids "dead-link" probes that return no URL/DOM mutation when a
same-path link is clicked — useful for nav primitives that get
exercised by behavioural verifiers / e2e probes.

```typescript
function SafeLink({
  to,
  children,
  ...rest
}: Omit<LinkProps & RefAttributes<HTMLAnchorElement>, "to"> & { to: string; children?: ReactNode; }): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
