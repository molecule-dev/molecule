/**
 * Top-level React error boundary that catches render errors, logs them via
 * the bonded `@molecule/app-logger`, and shows a minimal localized fallback
 * message through `@molecule/app-i18n`.
 *
 * Exports `<RootErrorBoundary>` (class component; `children` is the only
 * prop). Mount it directly under your routing root so it covers the whole
 * route tree.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react'
 *
 * import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
 *
 * function AppRoot({ children }: { children: ReactNode }) {
 *   return <RootErrorBoundary>{children}</RootErrorBoundary>
 * }
 * ```
 *
 * @remarks
 * - The fallback UI styles itself via `getClassMap()` — if no ClassMap is
 *   bonded the boundary itself throws while rendering the fallback. Ensure
 *   `setClassMap()` runs during bootstrap, before anything can error.
 * - There is no retry/reload action — the fallback is a static message
 *   (key `error.unknown`). Wrap or fork when you need a recovery button.
 * - React error boundaries catch RENDER errors only — not event handlers,
 *   async code, or server-side rendering errors.
 * - Uses the core `t()` from `@molecule/app-i18n` (not the React hook), so
 *   no `I18nProvider` is required; without locale registration it falls back
 *   to English. Translations: `@molecule/app-locales-root-error-boundary`.
 *
 * @module
 */

export * from './RootErrorBoundary.js'
