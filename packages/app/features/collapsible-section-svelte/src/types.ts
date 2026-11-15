/**
 * Types for the Svelte collapsible section and show-more toggle.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link CollapsibleSection} component. */
export interface CollapsibleSectionProps {
  /** Section heading — a snippet, or a plain string. */
  title?: Snippet | string
  /** Body to show when expanded — the `children` snippet. */
  children?: Snippet
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header — a snippet, or a plain string. */
  badge?: Snippet | string
  /** Optional right-side actions — a snippet, or a plain string. */
  actions?: Snippet | string
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ShowMore} component. */
export interface ShowMoreProps {
  /** Items before truncation — the `children` snippet. */
  children?: Snippet
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}
