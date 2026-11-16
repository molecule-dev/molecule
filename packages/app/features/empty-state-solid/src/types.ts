/**
 * Types of the Solid empty-state and CTA-card primitives.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link EmptyState} component. */
export interface EmptyStateProps {
  /** Visual — typically an `<Icon>` or `<img>`. Rendered in a circular badge above the heading. */
  icon?: JSX.Element
  /** Primary heading for a general, unselected collection. */
  title: JSX.Element
  /** Supporting description shown below the heading. */
  description?: JSX.Element
  /** Optional action for a general empty state. */
  action?: JSX.Element
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
  eyebrow?: JSX.Element
  /** Primary heading. */
  title: JSX.Element
  /** Supporting copy. */
  description?: JSX.Element
  /** Primary call-to-action. */
  action?: JSX.Element
  /** Optional visual / illustration rendered at the top or side. */
  media?: JSX.Element
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}
