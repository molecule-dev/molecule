/**
 * Types for the Vue collapsible section and show-more toggle.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link CollapsibleSection} component. */
export interface CollapsibleSectionProps {
  /**
   * Section heading — rendered as an expand-toggle button. Passed as a prop or
   * as the same-named slot — both work.
   */
  title?: VNodeChild
  /** Body to show when expanded — the DEFAULT slot. */
  children?: VNodeChild
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header (prop or the same-named slot). */
  badge?: VNodeChild
  /** Optional right-side actions (prop or the same-named slot). */
  actions?: VNodeChild
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ShowMore} component. */
export interface ShowMoreProps {
  /** Items before truncation — the DEFAULT slot. */
  children?: VNodeChild
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}
