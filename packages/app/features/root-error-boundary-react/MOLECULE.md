# @molecule/app-root-error-boundary-react

Top-level React error boundary that catches render errors, logs them via
the bonded `@molecule/app-logger`, and shows a minimal localized fallback
message through `@molecule/app-i18n`.

Exports `<RootErrorBoundary>` (class component; `children` is the only
prop). Mount it directly under your routing root so it covers the whole
route tree.

## Quick Start

```tsx
import type { ReactNode } from 'react'

import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'

function AppRoot({ children }: { children: ReactNode }) {
  return <RootErrorBoundary>{children}</RootErrorBoundary>
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-root-error-boundary-react @molecule/app-i18n @molecule/app-logger @molecule/app-ui react
npm install -D @types/react
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

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-logger`
- `@molecule/app-ui`
- `react`

- The fallback UI styles itself via `getClassMap()` — if no ClassMap is
  bonded the boundary itself throws while rendering the fallback. Ensure
  `setClassMap()` runs during bootstrap, before anything can error.
- There is no retry/reload action — the fallback is a static message
  (key `error.unknown`). Wrap or fork when you need a recovery button.
- React error boundaries catch RENDER errors only — not event handlers,
  async code, or server-side rendering errors.
- Uses the core `t()` from `@molecule/app-i18n` (not the React hook), so
  no `I18nProvider` is required; without locale registration it falls back
  to English. Translations: `@molecule/app-locales-root-error-boundary`.

## Translations

Translation strings are provided by `@molecule/app-locales-root-error-boundary`.
