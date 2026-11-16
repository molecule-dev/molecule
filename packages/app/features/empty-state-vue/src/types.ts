/**
 * Types for the Vue empty-state and CTA-card primitives.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link EmptyState} component. */
export interface EmptyStateProps {
  /**
   * Visual — typically an `<Icon>` or `<img>`. Rendered in a circular badge
   * above the heading. Passed as a prop or as the same-named slot.
   */
  icon?: VNodeChild
  /** Primary heading for a general, unselected collection. */
  title?: VNodeChild
  /** Supporting description shown below the heading. */
  description?: VNodeChild
  /** Optional action for a general empty state. */
  action?: VNodeChild
  /**
   * The selected view's translated message and required recovery element, kept
   * together so a filtered or personal list never reuses the whole
   * collection's empty message. Replaces `title`, `description` and `action`
   * when given.
   */
  view?: {
    /** The selected view's translated heading. */
    title: VNodeChild
    /** The selected view's supporting description. */
    description?: VNodeChild
    /** The selected view's recovery element — a router link or a button. */
    action: VNodeChild
  }
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
  eyebrow?: VNodeChild
  /** Primary heading. */
  title?: VNodeChild
  /** Supporting copy. */
  description?: VNodeChild
  /** Primary call-to-action. */
  action?: VNodeChild
  /** Optional visual / illustration rendered at the top or side. */
  media?: VNodeChild
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}
