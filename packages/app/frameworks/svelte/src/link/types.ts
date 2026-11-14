/**
 * Props of the Svelte `Link` component.
 *
 * @module
 */

import type { Snippet } from 'svelte'
import type { HTMLAnchorAttributes } from 'svelte/elements'

/**
 * Props for `Link`. Every other anchor attribute (`class`, `target`, `rel`,
 * `aria-*`, `data-*`, `onclick`) goes on the anchor.
 */
export interface LinkProps extends Omit<HTMLAnchorAttributes, 'href' | 'children'> {
  /** Destination: an app path (`/settings?tab=billing#plan`) or a URL. Rendered as the anchor's `href`. */
  to: string
  /**
   * Replace the current history entry instead of pushing one. When omitted, a
   * link to the location already shown replaces it and any other link pushes,
   * as with react-router's `<Link>`.
   */
  replace?: boolean
  /** State stored with the new history entry (read back with `useLocation()`). */
  state?: unknown
  /** The link's content. */
  children?: Snippet
}
