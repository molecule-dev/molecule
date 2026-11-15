/**
 * Types of `@molecule/app-floating-action-button-angular` — the Angular
 * counterpart of `@molecule/app-floating-action-button-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link FloatingActionButton} — the same props
 * `@molecule/app-floating-action-button-react` accepts. The node prop `icon`
 * is projected content in Angular (an input cannot carry a node), so it is
 * typed `unknown`: pass it in the host template as `[slot=icon]` content, not
 * as a value.
 */
export interface FloatingActionButtonProps {
  /** Icon rendered inside the FAB, projected as `[slot=icon]` content. */
  icon?: unknown
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
