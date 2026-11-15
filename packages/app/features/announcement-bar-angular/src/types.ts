/**
 * Types of `@molecule/app-announcement-bar-angular` — the Angular counterpart
 * of `@molecule/app-announcement-bar-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Semantic kind, exposed as a `data-kind` attribute for per-kind styling (no built-in style change). */
export type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'

/**
 * Props accepted by the `AnnouncementBar` component.
 *
 * The message is projected content (`<ng-content>`), the icon is either the
 * `icon` input (text or a template ref) or a `[slot=icon]` projection, and
 * `onDismiss` is the `onDismiss` input.
 */
export interface AnnouncementBarProps {
  /** Optional leading icon — text, a template ref, or `[slot=icon]` content. */
  icon?: TemplateRef<unknown> | string | null
  /**
   * Optional call-to-action (link or button). Node props are templated
   * content in Angular, so the label is typed `unknown`: pass a plain string
   * or an `<ng-template>` ref.
   */
  action?: {
    /** The action's label — text or a template ref. */
    label: unknown
    /** Rendering as a link: the action is an `<a href>` instead of a `<button>`. */
    href?: string
    /**
     * Called when the action button is clicked (ignored when `href` is set).
     * React's DOM click handler receives the click event, so the callback may
     * take it.
     */
    onClick?: (event?: MouseEvent) => void
  } | null
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
