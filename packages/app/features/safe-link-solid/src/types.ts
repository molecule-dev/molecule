/**
 * Types for the Solid SafeLink router link.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link SafeLink} component. */
export interface SafeLinkProps extends Omit<
  JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'children'
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
  /** The link's content. */
  children?: JSX.Element
  /** The anchor's click listener; it runs before the in-app navigation, like react-router's `<Link onClick>`. */
  onClick?: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>
}
