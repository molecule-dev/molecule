/**
 * Top-level React error boundary that catches render errors, logs them via
 * the bonded `@molecule/app-logger`, and shows a minimal localized fallback
 * message through `useTranslation()` from `@molecule/app-react`.
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
 * - The fallback translates through `useTranslation()`, so it re-renders in
 *   the new language after a locale switch. No `I18nProvider` is required:
 *   outside one it reads the bonded `@molecule/app-i18n` provider, and without
 *   locale registration it falls back to English. Translations:
 *   `@molecule/app-locales-root-error-boundary`.
 *
 * @module
 */

export * from './RootErrorBoundary.js'
