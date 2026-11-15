import type { JSX } from 'solid-js'

/** Props accepted by the {@link WikiPageHeader} component. */
export interface WikiPageHeaderProps {
  /** Page title. */
  title: JSX.Element
  /** Optional breadcrumb trail above the title. */
  breadcrumb?: JSX.Element
  /** Version label ("v23", "rev. 2025-04-12"). */
  version?: JSX.Element
  /** Last-updated display (relative or absolute). */
  updatedAt?: JSX.Element
  /** Updated-by author display. */
  updatedBy?: JSX.Element
  /** Tag chips. */
  tags?: JSX.Element
  /** Called when the user clicks Edit. */
  onEdit?: () => void
  /** Called when the user clicks History. */
  onHistory?: () => void
  /** Optional extra right-side actions. */
  extraActions?: JSX.Element
  /** Extra classes. */
  className?: string
}
