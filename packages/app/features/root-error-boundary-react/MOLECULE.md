# @molecule/app-root-error-boundary-react

Top-level React error boundary that catches render errors, logs them via the
bonded `@molecule/app-logger`, and shows a minimal recovery surface localized
through `@molecule/app-i18n`.

Reproduces the byte-identical `RootErrorBoundary` that ships in 4 flagship
apps. Use this directly under your routing root so it covers the whole
route tree.

## Quick Start

```tsx
import { RouterProvider } from 'react-router-dom'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'

<RootErrorBoundary>
  <RouterProvider router={router} />
</RootErrorBoundary>
```

## Type
`feature`

## Installation

```bash
npm install @molecule/app-root-error-boundary-react
```

## Peer dependencies

- `@molecule/app-i18n` — for the localized fallback message
- `@molecule/app-logger` — for `error()` reporting
- `@molecule/app-ui` — for `getClassMap()`
- `react` ≥ 18

## API

### `<RootErrorBoundary>`

| Prop | Type | Description |
| --- | --- | --- |
| `children` | `ReactNode` | The subtree to wrap — typically your router or app shell. |

## i18n keys

- `error.unknown` — Default: `An unexpected error occurred.`

## Notes

- Class component (necessary for React error boundaries — there is no hook
  equivalent). That's why this package depends on `@molecule/app-i18n`'s
  imperative `t()` rather than the `useTranslation()` hook.
- The fallback intentionally shows a minimal surface — it does not surface
  the error string to the user, since callers may have non-friendly text in
  there. To customize the fallback, fork the component or compose your own
  boundary.
