import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

interface PresenceDotProps {
  status: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely for avatar overlays. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: '#22c55e',
  away: '#eab308',
  busy: '#ef4444',
  offline: '#94a3b8',
}

/**
 * Small colored circle indicating user presence. Use inline next to a
 * name, or with `position="overlay"` attached to the corner of an
 * `<Avatar>`.
 * @param root0
 * @param root0.status
 * @param root0.size
 * @param root0.position
 * @param root0.corner
 * @param root0.ariaLabel
 * @param root0.className
 */
export function PresenceDot({
  status,
  size = 10,
  position = 'inline',
  corner = 'bottom-right',
  ariaLabel,
  className,
}: PresenceDotProps) {
  const cm = getClassMap()
  const style: React.CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: '50%',
    background: STATUS_COLOR[status],
    boxShadow: position === 'overlay' ? '0 0 0 2px var(--color-surface, #fff)' : undefined,
  }
  if (position === 'overlay') {
    style.position = 'absolute'
    if (corner.includes('top')) style.top = 0
    if (corner.includes('bottom')) style.bottom = 0
    if (corner.includes('right')) style.right = 0
    if (corner.includes('left')) style.left = 0
  }
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? `Presence: ${status}`}
      className={cm.cn(className)}
      style={style}
    />
  )
}
