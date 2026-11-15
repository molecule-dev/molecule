/**
 * Types of `@molecule/app-safe-link-angular` — the Angular counterpart of
 * `@molecule/app-safe-link-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link SafeLink} — the same props
 * `@molecule/app-safe-link-react` accepts. The link's content is projected
 * content in Angular (an input cannot carry a node), so `children` is typed
 * `unknown`: pass it in the host template, not as a value.
 */
export interface SafeLinkProps {
  /**
   * Destination: a string path only (`/settings`, `/blog/`), as with react-router's
   * `<Link to>` (no partial-Path objects). Rendered as the anchor's `href`, with a
   * `#top` fragment appended when it matches the current path.
   */
  to?: string
  /**
   * Replace the current history entry instead of pushing one. When omitted, a
   * link to the location already shown replaces it and any other link pushes,
   * as with react-router's `<Link>`.
   */
  replace?: boolean
  /** State stored with the new history entry (read back with `useLocation()`). */
  state?: unknown
  /** Extra classes on the anchor. */
  className?: string
  /** The link's content, projected as the element's default content. */
  children?: unknown
  /** The anchor's click listener; the in-app navigation runs after it, like react-router's `<Link onClick>`. */
  onClick?: unknown
}
