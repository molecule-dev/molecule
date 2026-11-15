/**
 * Types for the Vue editor layout.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link EditorLayout} component. */
export interface EditorLayoutProps {
  /**
   * Sticky top bar — typically title + save/publish buttons + status
   * indicator. Passed as a prop or as the same-named slot — both work.
   */
  topBar?: VNodeChild
  /** Main editing canvas (wysiwyg, drawable area, form, code editor). */
  canvas?: VNodeChild
  /**
   * Optional right-side settings / metadata panel. Passed as a prop or as the
   * same-named slot — both work.
   */
  sidePanel?: VNodeChild
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
