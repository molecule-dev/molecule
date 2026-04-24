# @molecule/app-analytics-react

React bindings for `@molecule/app-analytics`.

Provides ready-made React components that consume the wired analytics
bond. Currently exports `AnalyticsRouteListener`, a render-free
component that fires a `page` event on every client-side route change.

Mount `AnalyticsRouteListener` once inside a `BrowserRouter`
subtree — it listens for `useLocation()` changes and forwards each
pathname / search change to the wired analytics bond's `page()`.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-analytics-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-analytics` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
