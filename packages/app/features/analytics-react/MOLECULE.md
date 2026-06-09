# @molecule/app-analytics-react

React bindings for `@molecule/app-analytics`.

Provides ready-made React components that consume the wired analytics
bond. Currently exports `AnalyticsRouteListener`, a render-free
component that fires a `page` event on every client-side route change.

Mount `AnalyticsRouteListener` once inside a `BrowserRouter`
subtree — it listens for `useLocation()` changes and forwards each
pathname / search change to the wired analytics bond's `page()`.

## Quick Start

```tsx
import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export function App() {
  return (
    <BrowserRouter>
      <AnalyticsRouteListener />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-analytics-react
```

## API

### Functions

#### `AnalyticsRouteListener()`

Records a `page_view` on client-side route changes.

Mount once inside a `BrowserRouter` subtree. On every pathname /
search change, dispatches a `page` event through the wired analytics
bond. Renders nothing.

```typescript
function AnalyticsRouteListener(): null
```

**Returns:** Always `null` — this component renders nothing.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-analytics` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
