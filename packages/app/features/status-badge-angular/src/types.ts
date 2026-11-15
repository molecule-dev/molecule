/**
 * Types of `@molecule/app-status-badge-angular` — the Angular counterparts of
 * `@molecule/app-status-badge-react`'s two components: the same props (React
 * names) and the same DOM for the same input.
 *
 * @module
 */

/** Semantic status kind used to select badge color variants. */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

/**
 * Props accepted by {@link StatusBadge} — the same props
 * `@molecule/app-status-badge-react` accepts. Node props (`children`, `icon`)
 * are projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values. `icon` is
 * selected by `[slot=icon]`; everything else is the default projection.
 */
export interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label, projected as the element's default content. */
  children?: unknown
  /** Optional leading icon, projected as `[slot=icon]` content. */
  icon?: unknown
  /**
   * Visual appearance variant.
   * - `'ui'` (default) — the ClassMap badge styling, honoring the active
   *   ClassMap bond and working with any theme.
   * - `'uppercase-pill'` — a compact uppercase pill that colors itself with
   *   the SAME ClassMap `badge` tokens, then layers `cm.uppercase` +
   *   `cm.trackingWide` for the uppercase treatment.
   */
  appearance?: 'ui' | 'uppercase-pill'
  /** Extra classes passed through to the rendered element. */
  className?: string
}

/**
 * Props accepted by {@link StatusPill} — the same props
 * `@molecule/app-status-badge-react` accepts. `children` is projected content.
 */
export interface StatusPillProps {
  /** Semantic kind. */
  kind?: StatusKind
  /** Pill label, projected as the element's default content. */
  children?: unknown
  /** Render a leading dot indicator. Defaults to true. */
  dot?: boolean
  /** Extra classes. */
  className?: string
}
