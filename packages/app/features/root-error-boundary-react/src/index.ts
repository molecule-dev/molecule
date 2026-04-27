/**
 * Top-level React error boundary that catches render errors, logs them via
 * the bonded `@molecule/app-logger`, and shows a minimal localized recovery
 * surface through `@molecule/app-i18n`.
 *
 * @example
 * import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
 *
 * <RootErrorBoundary>
 *   <RouterProvider router={router} />
 * </RootErrorBoundary>
 */
export * from './RootErrorBoundary.js'
