/**
 * The props {@link EmptyState} accepts: the general collection, or one selected
 * view. Kept out of `index.ts` so the package's public export names stay the
 * same as `@molecule/app-empty-state-react`'s.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { EmptyStateProps } from './types.js'

/** Selected-view content stays together, without changing the extendable public interface. */
export type SelectedViewEmptyStateProps = Omit<
  EmptyStateProps,
  'title' | 'description' | 'action' | 'view'
> & {
  /** The selected view's translated message and required recovery element. */
  view: {
    /** The selected view's translated heading. */
    title: Snippet | string
    /** The selected view's supporting description. */
    description?: Snippet | string
    /** The selected view's recovery element — a router link or a button. */
    action: Snippet | string
  }
  /** A selected view has no generic title beside it. */
  title?: never
  /** A selected view has no generic description beside it. */
  description?: never
  /** A selected view has no generic action beside it. */
  action?: never
}

/** Props {@link EmptyState} accepts: the general collection, or one selected view. */
export type EmptyStateComponentProps = EmptyStateProps | SelectedViewEmptyStateProps
