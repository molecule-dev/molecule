/**
 * Types for the Svelte editor layout.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link EditorLayout} component. */
export interface EditorLayoutProps {
  /**
   * Sticky top bar — typically title + save/publish buttons + status
   * indicator, as a snippet.
   */
  topBar?: Snippet
  /** Main editing canvas (wysiwyg, drawable area, form, code editor). */
  canvas?: Snippet
  /** Optional right-side settings / metadata panel, as a snippet. */
  sidePanel?: Snippet
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
