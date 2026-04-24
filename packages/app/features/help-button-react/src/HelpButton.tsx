import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface HelpButtonProps {
  /** Optional icon — defaults to "?". */
  icon?: ReactNode
  /** Accessible label — defaults to "Help". */
  label?: string
  /** Click handler — open a help panel, support chat, docs, etc. */
  onClick?: () => void
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

const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

/**
 * Floating (or inline) help button — opens a support panel, chat
 * widget, or docs. Default icon is "?" but apps can swap in their own.
 *
 * Use `position="inline"` inside other UI to drop the fixed
 * positioning and render as a normal in-flow button.
 * @param root0
 * @param root0.icon
 * @param root0.label
 * @param root0.onClick
 * @param root0.href
 * @param root0.size
 * @param root0.position
 * @param root0.hasNotification
 * @param root0.className
 */
export function HelpButton({
  icon,
  label,
  onClick,
  href,
  size = 'md',
  position = 'bottom-right',
  hasNotification,
  className,
}: HelpButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const dim = SIZE_MAP[size]
  const ariaLabel = label ?? t('helpButton.label', {}, { defaultValue: 'Help' })
  const style: React.CSSProperties = {
    width: dim,
    height: dim,
    ...(position === 'bottom-right'
      ? { position: 'fixed', right: 24, bottom: 24, zIndex: 40 }
      : position === 'bottom-left'
        ? { position: 'fixed', left: 24, bottom: 24, zIndex: 40 }
        : {}),
    transform: hovered ? 'scale(1.05)' : undefined,
    transition: 'transform 150ms ease',
  }
  const content = (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.position('relative'),
      )}
      style={{ width: '100%', height: '100%' }}
    >
      {icon ?? (
        <span aria-hidden style={{ fontSize: dim * 0.45, fontWeight: 700 }}>
          ?
        </span>
      )}
      {hasNotification && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'currentColor',
          }}
        />
      )}
    </span>
  )
  const commonProps = {
    'aria-label': ariaLabel,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    className,
    style,
  }
  return href ? (
    <a href={href} {...commonProps}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} {...commonProps}>
      {content}
    </button>
  )
}
