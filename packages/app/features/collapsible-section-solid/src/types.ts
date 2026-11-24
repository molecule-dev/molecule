/**
 * Types for the Solid collapsible section and show-more toggle.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { NodeItems } from '@molecule/app-solid'

/** Props accepted by the {@link CollapsibleSection} component. */
export interface CollapsibleSectionProps {
  /** Section heading — rendered as an expand-toggle button. */
  title?: JSX.Element
  /** Body to show when expanded. */
  children?: JSX.Element
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header. */
  badge?: JSX.Element
  /** Optional right-side actions. */
  actions?: JSX.Element
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ShowMore} component. */
export interface ShowMoreProps {
  /**
   * Items before truncation: plain JSX, or accessor items (`() => <Row />`), which are created
   * only when shown. A row may have any root, a `<Show>` or a fragment included.
   */
  children?: NodeItems
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}
