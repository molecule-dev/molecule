/**
 * RootErrorBoundary component (React parity).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { type Accessor, catchError, createMemo, createSignal } from 'solid-js'

import { error as logError } from '@molecule/app-logger'

import { RootErrorFallback } from './RootErrorFallback.jsx'

/** Props accepted by the {@link RootErrorBoundary} component. */
interface Props {
  /** The app tree to guard (typically the routed root). */
  children?: JSX.Element
}

/**
 * Top-level error boundary that catches descendant render errors, logs them
 * via the bonded `@molecule/app-logger`, and falls back to a minimal
 * localized recovery surface read through `useTranslation()` from
 * `@molecule/app-solid`. Renders its children untouched while no error has
 * been caught — there is no wrapper element, matching React's fragment root.
 *
 * This is the Solid counterpart of `@molecule/app-root-error-boundary-react`.
 *
 * @param props - Component props (see {@link Props}).
 * @returns The guarded tree, or the recovery alert once an error was caught.
 *
 * @remarks
 * Solid's `catchError` is the boundary: the first caught error flips the
 * component into its error state (React's `getDerivedStateFromError`) and the
 * report goes to the bonded logger (React's `componentDidCatch`). The signal
 * stops the error from re-reaching Solid's owner chain on the re-render, as
 * React's boundary stops the error from climbing past the tree root.
 */
export function RootErrorBoundary(props: Props): Accessor<JSX.Element | undefined> {
  const [hasError, setHasError] = createSignal(false)

  // A memo, exactly how Solid's own `ErrorBoundary` renders: the switch
  // between children and fallback is reactive state, not a re-mount.
  return createMemo(() => {
    if (hasError()) return <RootErrorFallback />
    return catchError(
      () => props.children,
      (error) => {
        logError(error instanceof Error ? error : new Error(String(error)), '')
        setHasError(true)
      },
    )
  })
}
