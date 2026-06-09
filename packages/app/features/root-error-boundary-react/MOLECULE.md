# @molecule/app-root-error-boundary-react

Top-level React error boundary that logs render errors via the bonded app logger and shows a minimal localized recovery surface

## Type
`feature`

## Installation
```bash
npm install @molecule/app-root-error-boundary-react
```

## API

### Classes

#### `RootErrorBoundary`

Top-level React error boundary that catches render errors, logs them via
the bonded `@molecule/app-logger`, and falls back to a minimal recovery
surface localized through `@molecule/app-i18n`.

Use this directly under your routing root so it covers the whole route tree.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
