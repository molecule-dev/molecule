/**
 * Solid top-level error boundary — the counterpart of
 * `@molecule/app-root-error-boundary-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `<RootErrorBoundary>` (`children` is the only prop). Mount it
 * directly under your routing root so it covers the whole route tree.
 *
 * @example
 * ```tsx
 * import { Router } from '@solidjs/router'
 *
 * import { RootErrorBoundary } from '@molecule/app-root-error-boundary-solid'
 *
 * function AppRoot() {
 *   return (
 *     <RootErrorBoundary>
 *       <Router>…</Router>
 *     </RootErrorBoundary>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The fallback UI styles itself via `getClassMap()` — if no ClassMap is
 *   bonded the boundary itself throws while rendering the fallback. Ensure
 *   `setClassMap()` runs during bootstrap, before anything can error.
 * - There is no retry/reload action — the fallback is a static message
 *   (key `error.unknown`). Wrap or fork when you need a recovery button.
 * - The boundary catches RENDER errors only — not event handlers, async code,
 *   or server-side rendering errors.
 * - The fallback translates through `useTranslation()`, so it re-renders in
 *   the new language after a locale switch. No `MoleculeProvider` is
 *   required: outside one it reads the bonded `@molecule/app-i18n` provider,
 *   and without locale registration it falls back to English. Translations:
 *   `@molecule/app-locales-root-error-boundary`.
 *
 * @module
 */

export * from './RootErrorBoundary.jsx'
