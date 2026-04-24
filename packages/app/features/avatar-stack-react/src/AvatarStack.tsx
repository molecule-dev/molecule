import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/**
 *
 */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

interface AvatarStackProps {
  /** People to render. */
  people: AvatarStackPerson[]
  /** Maximum visible avatars. Remaining are summarised in an "overflow" chip. */
  max?: number
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer stack. */
  className?: string
}

/**
 * Horizontal stack of overlapping avatars (assignees, attendees, etc.).
 *
 * Renders up to `max` avatars; any remaining are summarised as `+N` in a
 * trailing chip.
 * @param root0
 * @param root0.people
 * @param root0.max
 * @param root0.size
 * @param root0.className
 */
export function AvatarStack({ people, max = 4, size = 'sm', className }: AvatarStackProps) {
  const cm = getClassMap()
  const visible = people.slice(0, max)
  const overflow = Math.max(0, people.length - visible.length)
  return (
    <div className={cm.cn(cm.flex({ align: 'center' }), className)}>
      {visible.map((p, i) => (
        <span key={i} className={cm.cn(i === 0 ? '' : cm.sp('ml', -2 as 0))}>
          <Avatar src={p.src} alt={p.alt ?? p.name} name={p.name} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cm.cn(
            cm.sp('ml', -2 as 0),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
          )}
          aria-label={`+${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
