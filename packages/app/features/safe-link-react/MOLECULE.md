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

## Injection Notes

### Requirements

Peer dependencies:
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
