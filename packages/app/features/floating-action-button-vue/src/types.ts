/**
 * Types for the Vue floating action button.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for the {@link FloatingActionButton} component. */
export interface FloatingActionButtonProps {
  /** Icon rendered inside the FAB — passed as a prop or as the same-named slot. */
  icon?: VNodeChild
  /** Accessible label / tooltip text (usually `t('...')`). */
  label: string
  /** Click handler (mutually exclusive with `href`). */
  onClick?: (event: MouseEvent) => void
  /** Navigation target (mutually exclusive with `onClick`). */
  href?: string
  /** Screen corner for anchoring. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the label on hover. Defaults to true. */
  showTooltip?: boolean
  /** Extra classes. */
  className?: string
}
