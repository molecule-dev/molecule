/**
 * Types of `@molecule/app-help-button-angular` — the Angular counterpart of
 * `@molecule/app-help-button-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for `HelpButton` — the same props
 * `@molecule/app-help-button-react` accepts. The node prop `icon` is
 * projected content in Angular (an input cannot carry a node): pass it in the
 * host template as `[slot=icon]` content, not as a value.
 */
export interface HelpButtonProps {
  /** Optional icon, projected as `[slot=icon]` content — defaults to "?". */
  icon?: unknown
  /** Accessible label — defaults to "Help". */
  label?: string
  /** Click handler — open a help panel, support chat, docs, etc. */
  onClick?: (event: MouseEvent) => void
  /** When provided, clicking navigates to this URL. Mutually exclusive with onClick. */
  href?: string
  /** Visual size. Defaults to `'md'`. */
  size?: 'sm' | 'md' | 'lg'
  /** Position when used as a floating button. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left' | 'inline'
  /** Show unread/notification dot in the corner. */
  hasNotification?: boolean
  /** Extra classes. */
  className?: string
}
