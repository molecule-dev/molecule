/**
 * Types of `@molecule/app-status-badge-vue` — the Vue counterparts of
 * `@molecule/app-status-badge-react`'s two components: the same props (React
 * names) and the same DOM for the same input.
 *
 * Node-valued props (`children`, `icon`) arrive as the DEFAULT slot and a
 * same-named `icon` slot, or as props of the same names.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Semantic status kind used to select badge color variants. */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

/** Props for the {@link StatusBadge} component. */
export interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label (usually `t('...')`) — the default slot, or a prop. */
  children?: VNodeChild
  /** Optional leading icon — the `icon` slot, or a prop. */
  icon?: VNodeChild
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
  /** Pill label — the default slot, or a prop. */
  children?: VNodeChild
  /** Render a leading dot indicator. Defaults to true. */
  dot?: boolean
  /** Extra classes. */
  className?: string
}
