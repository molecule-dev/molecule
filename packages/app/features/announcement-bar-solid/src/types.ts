/**
 * Types for the Solid announcement bar.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Semantic kind, exposed as a `data-kind` attribute for per-kind styling (no built-in style change). */
export type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'

/** Props accepted by the {@link AnnouncementBar} component. */
export interface AnnouncementBarProps {
  /** Primary message. */
  children: JSX.Element
  /** Optional leading icon. */
  icon?: JSX.Element
  /** Optional call-to-action (link or button). */
  action?: {
    /** The action's label — a string, or a node. */
    label: JSX.Element
    /** Rendering as a link: the action is an `<a href>` instead of a `<button>`. */
    href?: string
    /**
     * Called when the action button is clicked (ignored when `href` is set).
     * React's DOM click handler receives the click event, so the callback may
     * take it.
     */
    onClick?: (event?: MouseEvent) => void
  }
  /** Semantic kind — emitted as `data-kind` on the root (style via CSS/`className`). Defaults to `'info'`. */
  kind?: AnnouncementKind
  /** Show a dismiss (×) button. Defaults to true. */
  dismissible?: boolean
  /** Called when the bar is dismissed. */
  onDismiss?: () => void
  /** Controlled visibility — when provided, overrides internal state. */
  visible?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
