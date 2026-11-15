/**
 * Types for the Solid editor layout.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link EditorLayout} component. */
export interface EditorLayoutProps {
  /** Sticky top bar — typically title + save/publish buttons + status indicator. */
  topBar?: JSX.Element
  /** Main editing canvas (wysiwyg, drawable area, form, code editor). */
  canvas?: JSX.Element
  /** Optional right-side settings / metadata panel. */
  sidePanel?: JSX.Element
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
