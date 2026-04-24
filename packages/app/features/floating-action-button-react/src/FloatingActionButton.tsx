import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FloatingActionButtonProps {
  /** Icon rendered inside the FAB. */
  icon: ReactNode
  /** Accessible label / tooltip text (usually `t('...')`). */
  label: string
  /** Click handler (mutually exclusive with `href`). */
  onClick?: () => void
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

const POSITION_STYLES: Record<
  NonNullable<FloatingActionButtonProps['position']>,
  React.CSSProperties
> = {
  'bottom-right': { position: 'fixed', right: 24, bottom: 24 },
  'bottom-left': { position: 'fixed', left: 24, bottom: 24 },
  'top-right': { position: 'fixed', right: 24, top: 24 },
  'top-left': { position: 'fixed', left: 24, top: 24 },
}

const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

/**
 * Fixed-position circular action button. Renders either an anchor (when
 * `href` is set) or a button (when `onClick` is set). Positioning is
 * inline-style so the component works without extra CSS setup.
 * @param root0
 * @param root0.icon
 * @param root0.label
 * @param root0.onClick
 * @param root0.href
 * @param root0.position
 * @param root0.size
 * @param root0.showTooltip
 * @param root0.className
 */
export function FloatingActionButton({
  icon,
  label,
  onClick,
  href,
  position = 'bottom-right',
  size = 'md',
  showTooltip = true,
  className,
}: FloatingActionButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dim = SIZE_MAP[size] * 4 // px
  const commonClass = cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.roundedFull,
    className,
  )
  const style: React.CSSProperties = {
    ...POSITION_STYLES[position],
    width: dim,
    height: dim,
    zIndex: 40,
  }
  const ariaLabel = t(label, {}, { defaultValue: label })
  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        title={showTooltip ? ariaLabel : undefined}
        className={commonClass}
        style={style}
      >
        {icon}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={showTooltip ? ariaLabel : undefined}
      className={commonClass}
      style={style}
    >
      {icon}
    </button>
  )
}
