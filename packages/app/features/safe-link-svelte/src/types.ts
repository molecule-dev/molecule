/**
 * Types for the Svelte SafeLink router link.
 *
 * @module
 */

import type { Snippet } from 'svelte'
import type { HTMLAnchorAttributes } from 'svelte/elements'

/** Props of the Svelte `SafeLink` component. */
export interface SafeLinkProps extends Omit<
  HTMLAnchorAttributes,
  'href' | 'children' | 'onclick' | 'class'
> {
  /**
   * Destination: a string path only (`/settings`, `/blog/`), as with react-router's
   * `<Link to>` (no partial-Path objects). Rendered as the anchor's `href`, with a
   * `#top` fragment appended when it matches the current path.
   */
  to: string
  /**
   * Replace the current history entry instead of pushing one. When omitted, a
   * link to the location already shown replaces it and any other link pushes,
   * as with react-router's `<Link>`.
   */
  replace?: boolean
  /** State stored with the new history entry (read back with `useLocation()`). */
  state?: unknown
  /** Extra classes on the anchor. */
  className?: string
  /**
   * The anchor's click listener; it runs before the in-app navigation, like
   * react-router's `<Link onClick>`. Svelte's own `onclick` attribute stays
   * available through the rest props.
   */
  onClick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }) => void
  /** The link's content. */
  children?: Snippet
}
