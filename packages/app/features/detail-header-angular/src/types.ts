/**
 * Types of `@molecule/app-detail-header-angular` — the Angular counterpart of
 * `@molecule/app-detail-header-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link DetailHeader} — the same props
 * `@molecule/app-detail-header-react` accepts. Node props (`title`,
 * `subtitle`, `leading`, `status`, `actions`, `meta`, `search`) are projected
 * content in Angular (an input cannot carry a node), so they are typed
 * `unknown`: pass node content as `[slot=<name>]` children of the host
 * element, and plain strings as the input.
 */
export interface DetailHeaderProps {
  /** Primary heading — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional subtitle shown below the title — a string input, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional leading avatar / icon / logo, projected as `[slot=leading]` content. */
  leading?: unknown
  /** Optional status indicator, projected as `[slot=status]` content. */
  status?: unknown
  /** Right-aligned actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Optional metadata row, projected as `[slot=meta]` content. */
  meta?: unknown
  /** Optional search slot, projected as `[slot=search]` content. */
  search?: unknown
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
