# @molecule/app-safe-link-react

`@molecule/app-safe-link-react` — react-router `<Link>` wrapper that
appends a `#top` fragment when the destination matches the current path,
so a same-path click still produces an observable URL change. Useful for
nav primitives exercised by behavioural verifiers / e2e probes.

Note: "safe" refers to dead-link-probe safety only — this adds NO security
behavior (no `rel="noopener"`, no URL allowlisting). All other `Link`
props pass through unchanged.

## Quick Start

```tsx
import { SafeLink } from '@molecule/app-safe-link-react'

function NavItem() {
  return <SafeLink to="/dashboard">Dashboard</SafeLink>
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-safe-link-react react react-router-dom
npm install -D @types/react
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

### Runtime Dependencies

- `react`
- `react-router-dom`

- Must render inside a react-router `<Router>` / `RouterProvider` —
  `useLocation()` throws otherwise. Peer-depends on `react-router-dom`
  v6/v7; do not use in apps on a different router.
- `to` accepts a string path only (no partial-Path objects).
- Use the NAMED import (`import { SafeLink } from …`); the package barrel
  does not re-export the file's default export.
- Internal routes only — for external URLs use a plain `<a>` (with
  `rel="noopener noreferrer"` when `target="_blank"`).
