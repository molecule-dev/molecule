/**
 * Types of `@molecule/app-wiki-page-header-angular` — the Angular counterpart
 * of `@molecule/app-wiki-page-header-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link WikiPageHeader} — the same props
 * `@molecule/app-wiki-page-header-react` accepts. Node props (`title`,
 * `breadcrumb`, `version`, `updatedAt`, `updatedBy`, `tags`,
 * `extraActions`) are projected content in Angular (an input cannot carry a
 * node), so they are typed `unknown`: pass node content as `[slot=<name>]`
 * children of the host element, and plain strings as the input.
 */
export interface WikiPageHeaderProps {
  /** Page title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional breadcrumb trail above the title — a string input, or `[slot=breadcrumb]` content. */
  breadcrumb?: unknown
  /** Version label ("v23", "rev. 2025-04-12") — a string input, or `[slot=version]` content. */
  version?: unknown
  /** Last-updated display (relative or absolute) — a string input, or `[slot=updatedAt]` content. */
  updatedAt?: unknown
  /** Updated-by author display — a string input, or `[slot=updatedBy]` content. */
  updatedBy?: unknown
  /** Tag chips — a string input, or `[slot=tags]` content. */
  tags?: unknown
  /** Called when the user clicks Edit (the click event is passed through). */
  onEdit?: (event?: unknown) => void
  /** Called when the user clicks History (the click event is passed through). */
  onHistory?: (event?: unknown) => void
  /** Optional extra right-side actions — a string input, or `[slot=extraActions]` content. */
  extraActions?: unknown
  /** Extra classes. */
  className?: string
}
