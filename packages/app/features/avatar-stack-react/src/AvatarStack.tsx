import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap, type WebStyle } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/**
 * Negative left margin that pulls each avatar over its predecessor so the
 * stack visually overlaps. This is an inline style deliberately: the
 * ClassMap spacing scale (`SpacingScale`) is `0…24`, all non-negative, so
 * neither `cm.sp('ml', n)` nor its compound style form can express a
 * negative margin — one of the sanctioned "ClassMap can't express it"
 * inline-style cases (AGENTS.md Rule 5). `-0.5rem` mirrors the intended
 * `-2` Tailwind spacing step.
 */
const OVERLAP_MARGIN: WebStyle = { marginLeft: '-0.5rem' }

/** Represents a single person entry rendered inside an AvatarStack. */
export interface AvatarStackPerson {
  /** Display name (also used to generate the text fallback). */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional alt text — defaults to `name`. */
  alt?: string
}

/** Props for {@link AvatarStack}. */
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
  const { t } = useTranslation()
  const visible = people.slice(0, max)
  const overflow = Math.max(0, people.length - visible.length)
  return (
    <Box as="div" className={cm.cn(cm.flex({ align: 'center' }), className)}>
      {visible.map((p, i) => (
        <Box as="span" key={i} webStyle={i === 0 ? undefined : OVERLAP_MARGIN}>
          <Avatar src={p.src} alt={p.alt ?? p.name} name={p.name} size={size} />
        </Box>
      ))}
      {overflow > 0 && (
        <Text
          as="span"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
          )}
          webStyle={OVERLAP_MARGIN}
          aria-label={t(
            'avatarStack.more',
            { count: overflow },
            { defaultValue: '+{{count}} more' },
          )}
        >
          {t('avatarStack.overflowPrefix', undefined, { defaultValue: '+' })}
          {overflow}
        </Text>
      )}
    </Box>
  )
}
