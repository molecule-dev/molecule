/**
 * Types of `@molecule/app-status-badge-solid` — the Solid counterparts of
 * `@molecule/app-status-badge-react`'s two components: the same props (React
 * names) and the same DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Semantic status kind used to select badge color variants. */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

/** Props for the {@link StatusBadge} component. */
export interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label (usually `t('...')`). */
  children: JSX.Element
  /** Optional leading icon (e.g. a dot or check). */
  icon?: JSX.Element
  /**
   * Visual appearance variant.
   * - `'ui'` (default) — wraps the framework `<Badge>` with ClassMap-driven
   *   coloring. Honors the active ClassMap bond's badge styling and works
   *   with any theme.
   * - `'uppercase-pill'` — a compact uppercase pill that colors itself with
   *   the SAME ClassMap `badge` tokens as the `'ui'` variant, then layers
   *   `cm.uppercase` + `cm.trackingWide` for the uppercase treatment.
   */
  appearance?: 'ui' | 'uppercase-pill'
  /** Extra classes passed through to the rendered element. */
  className?: string
}

/** Props for the {@link StatusPill} component. */
export interface StatusPillProps {
  /** Semantic kind. */
  kind?: StatusKind
  /** Pill label. */
  children: JSX.Element
  /** Render a leading dot indicator. Defaults to true. */
  dot?: boolean
  /** Extra classes. */
  className?: string
}
