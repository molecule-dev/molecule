/**
 * Types of `@molecule/app-collapsible-section-angular` — the Angular
 * counterpart of `@molecule/app-collapsible-section-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Props accepted by the {@link CollapsibleSection} component. */
export interface CollapsibleSectionProps {
  /**
   * Section heading — rendered as an expand-toggle button. Text or a
   * `<ng-template>` ref as the `title` input, or `[slot=title]` content.
   */
  title?: TemplateRef<unknown> | string | null
  /** Body to show when expanded — projected as the element's default content. */
  children?: unknown
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header (text, a template ref, or `[slot=badge]`). */
  badge?: TemplateRef<unknown> | string | null
  /** Optional right-side actions (text, a template ref, or `[slot=actions]`). */
  actions?: TemplateRef<unknown> | string | null
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ShowMore} component. */
export interface ShowMoreProps {
  /** Items before truncation — projected as the element's default content. */
  children?: unknown
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}
