import type { CSSProperties, JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/**
 * Negative left margin that pulls each avatar over its predecessor so the
 * stack visually overlaps. This is an inline style deliberately: the
 * ClassMap spacing scale (`SpacingScale`) is `0…24`, all non-negative, so
 * neither `cm.sp('ml', n)` nor its compound style form can express a
 * negative margin — one of the sanctioned "ClassMap can't express it"
 * inline-style cases (AGENTS.md Rule 5). `-0.5rem` mirrors the intended
 * `-2` Tailwind spacing step.
 */
const OVERLAP_MARGIN: CSSProperties = { marginLeft: '-0.5rem' }

/** Represents a single person entry rendered inside an AvatarStack. */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

export interface AvatarStackProps {
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
 * @param props - Component props (see {@link AvatarStackProps}).
 */
export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
  className,
}: AvatarStackProps): JSX.Element {
  const cm = getClassMap()
  const visible = people.slice(0, max)
  const overflow = Math.max(0, people.length - visible.length)
  return (
    <div className={cm.cn(cm.flex({ align: 'center' }), className)}>
      {visible.map((p, i) => (
        <span key={i} style={i === 0 ? undefined : OVERLAP_MARGIN}>
          <Avatar src={p.src} alt={p.alt ?? p.name} name={p.name} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
          )}
          style={OVERLAP_MARGIN}
          aria-label={`+${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
