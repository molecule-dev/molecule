import { getClassMap } from '@molecule/app-ui'

interface NotificationDotProps {
  /** When false, nothing is rendered. */
  visible?: boolean
  /** Color variant. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Dot size (pixels). Defaults to 8. */
  size?: number
  /** Optional positioning — `'corner'` places absolutely at top-right of parent. */
  position?: 'inline' | 'corner'
  /** Extra classes. */
  className?: string
}

const VARIANT_BG: Record<NonNullable<NotificationDotProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-outline',
}

/**
 * Tiny unread / presence indicator. For counted badges use
 * `<NotificationBadge>`.
 * @param root0
 * @param root0.visible
 * @param root0.variant
 * @param root0.size
 * @param root0.position
 * @param root0.className
 */
export function NotificationDot({
  visible = true,
  variant = 'error',
  size = 8,
  position = 'inline',
  className,
}: NotificationDotProps) {
  const cm = getClassMap()
  if (!visible) return null
  return (
    <span
      aria-hidden
      className={cm.cn(cm.roundedFull, VARIANT_BG[variant], className)}
      style={
        position === 'corner'
          ? { position: 'absolute', top: 2, right: 2, width: size, height: size }
          : { display: 'inline-block', width: size, height: size }
      }
    />
  )
}
