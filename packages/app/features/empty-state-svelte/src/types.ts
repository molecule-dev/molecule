/**
 * Types of the Svelte empty-state and CTA-card primitives.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link EmptyState} component. */
export interface EmptyStateProps {
  /** Visual — typically an icon or an `<img>`. Rendered in a circular badge above the heading. */
  icon?: Snippet | string
  /** Primary heading for a general, unselected collection. */
  title: Snippet | string
  /** Supporting description shown below the heading. */
  description?: Snippet | string
  /** Optional action for a general empty state. */
  action?: Snippet | string
  /** Selected views use the component's view-owned props instead. */
  view?: never
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string
}

/** Props accepted by the {@link CtaCard} component. */
export interface CtaCardProps {
  /** Optional small eyebrow line above the title. */
  eyebrow?: Snippet | string
  /** Primary heading. */
  title: Snippet | string
  /** Supporting copy. */
  description?: Snippet | string
  /** Primary call-to-action. */
  action?: Snippet | string
  /** Optional visual / illustration rendered at the top or side. */
  media?: Snippet | string
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}
