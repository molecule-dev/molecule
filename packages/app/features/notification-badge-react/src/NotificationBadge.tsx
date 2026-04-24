import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface NotificationBadgeProps {
  /** Numeric count — renders as a pill. When 0 and `hideOnZero` is true, the badge isn't rendered. */
  count: number
  /** Hide the badge when `count` is 0. Defaults to true. */
  hideOnZero?: boolean
  /** When `count > max`, renders as `max+`. Defaults to 99. */
  max?: number
  /** Accent color. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Extra classes. */
  className?: string
}

const VARIANT_BG: Record<NonNullable<NotificationBadgeProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-outline',
}

/**
 * Small count pill — typically attached to a nav item, icon button, or
 * inbox entry. Use `<NotificationDot>` when you just need a presence
 * indicator without a count.
 * @param root0
 * @param root0.count
 * @param root0.hideOnZero
 * @param root0.max
 * @param root0.variant
 * @param root0.className
 */
export function NotificationBadge({
  count,
  hideOnZero = true,
  max = 99,
  variant = 'error',
  className,
}: NotificationBadgeProps) {
  const cm = getClassMap()
  if (hideOnZero && count <= 0) return null
  const display = count > max ? `${max}+` : String(count)
  return (
    <span
      aria-label={`${count}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('px', 1),
        cm.roundedFull,
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        VARIANT_BG[variant],
        className,
      )}
      style={{ minWidth: 20, height: 20 }}
    >
      {display}
    </span>
  )
}
