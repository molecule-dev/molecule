import type { Snippet } from 'svelte'

/** Props accepted by the {@link WikiPageHeader} component. */
export interface WikiPageHeaderProps {
  /** Page title — a snippet or a plain string. */
  title: Snippet | string
  /** Optional breadcrumb trail above the title — a snippet or a plain string. */
  breadcrumb?: Snippet | string
  /** Version label ("v23", "rev. 2025-04-12") — a snippet or a plain string. */
  version?: Snippet | string
  /** Last-updated display (relative or absolute) — a snippet or a plain string. */
  updatedAt?: Snippet | string
  /** Updated-by author display — a snippet or a plain string. */
  updatedBy?: Snippet | string
  /** Tag chips — a snippet or a plain string. */
  tags?: Snippet | string
  /** Called when the user clicks Edit. */
  onEdit?: () => void
  /** Called when the user clicks History. */
  onHistory?: () => void
  /** Optional extra right-side actions — a snippet or a plain string. */
  extraActions?: Snippet | string
  /** Extra classes. */
  className?: string
}
