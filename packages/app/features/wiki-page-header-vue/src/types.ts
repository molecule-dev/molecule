/**
 * Types of `@molecule/app-wiki-page-header-vue` — the Vue counterpart of
 * `@molecule/app-wiki-page-header-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link WikiPageHeader} component (React's names). */
export interface WikiPageHeaderProps {
  /** Page title. */
  title: VNodeChild
  /** Optional breadcrumb trail above the title. */
  breadcrumb?: VNodeChild | null
  /** Version label ("v23", "rev. 2025-04-12"). */
  version?: VNodeChild | null
  /** Last-updated display (relative or absolute). */
  updatedAt?: VNodeChild | null
  /** Updated-by author display. */
  updatedBy?: VNodeChild | null
  /** Tag chips. */
  tags?: VNodeChild | null
  /** Called when the user clicks Edit. */
  onEdit?: () => void
  /** Called when the user clicks History. */
  onHistory?: () => void
  /** Optional extra right-side actions. */
  extraActions?: VNodeChild | null
  /** Extra classes. */
  className?: string
}
