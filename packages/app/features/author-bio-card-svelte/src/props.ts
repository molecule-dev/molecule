/**
 * Component props for the Svelte author bio card.
 *
 * Not re-exported from `src/index.ts`: the React package does not export its
 * props interface, so neither does this counterpart. The component and its
 * unit tests import it from here.
 *
 * @module
 */

import type { AuthorBioCardAuthor } from './types.js'

/**
 * Props accepted by `AuthorBioCard`.
 */
export interface AuthorBioCardProps {
  /** Author identity + bio + socials. */
  author: AuthorBioCardAuthor
  /**
   * Layout preset:
   * - `compact` (default) — single horizontal row, avatar + meta + button.
   * - `full` — large avatar, stacked meta block, social row + button.
   */
  layout?: 'compact' | 'full'
  /** Whether the viewer currently follows this author. */
  following?: boolean
  /** Toggle handler for the follow button. Omit to hide the button entirely. */
  onFollow?: (following: boolean) => void
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. Defaults to `author-bio-card`. */
  dataMolId?: string
}
