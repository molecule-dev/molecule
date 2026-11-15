import type { JSX } from 'solid-js'

/** Props for the {@link HelpButton} component. */
export interface HelpButtonProps {
  /** Optional icon — defaults to "?". */
  icon?: JSX.Element
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
