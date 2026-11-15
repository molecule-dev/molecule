/**
 * Types for the Svelte announcement bar.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Semantic kind, exposed as a `data-kind` attribute for per-kind styling (no built-in style change). */
export type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'

/** Props for {@link AnnouncementBar} — the same props (React names) as `@molecule/app-announcement-bar-react`. */
export interface AnnouncementBarProps {
  /** Primary message — the component's children snippet. */
  children: Snippet
  /** Optional leading icon — a snippet, or a plain string. */
  icon?: Snippet | string
  /** Optional call-to-action (link or button). */
  action?: {
    /** The action's label — a snippet, or a plain string. */
    label: Snippet | string
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
