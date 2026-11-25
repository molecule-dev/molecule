/**
 * Vue horizontal stack of overlapping avatars.
 *
 * Vue counterpart of `@molecule/app-avatar-stack-react`'s `AvatarStack` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { AvatarStackPerson } from './types.js'

/**
 * Negative left margin that pulls each avatar over its predecessor so the
 * stack visually overlaps. This is an inline style deliberately: the
 * ClassMap spacing scale (`SpacingScale`) is `0…24`, all non-negative, so
 * neither `cm.sp('ml', n)` nor its compound style form can express a
 * negative margin — one of the sanctioned "ClassMap can't express it"
 * inline-style cases. `-0.5rem` mirrors the intended `-2` Tailwind spacing
 * step.
 */
const OVERLAP_MARGIN = { marginLeft: '-0.5rem' }

/**
 * Horizontal stack of overlapping avatars (assignees, attendees, etc.).
 *
 * Renders up to `max` avatars; any remaining are summarised as `+N` in a
 * trailing chip. The chip's accessible name (`avatarStack.more`) and its
 * visible prefix (`avatarStack.overflowPrefix`) come from `useTranslation()`,
 * so the chip follows the active locale.
 *
 * @param props - Component props (see {@link AvatarStackProps}).
 * @returns The avatar stack component.
 */
export const AvatarStack = defineComponent({
  name: 'AvatarStack',
  props: {
    people: { type: Array as PropType<AvatarStackPerson[]>, required: true },
    max: { type: Number, default: 4 },
    size: {
      type: String as PropType<'xs' | 'sm' | 'md' | 'lg'>,
      default: 'sm',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const visible = props.people.slice(0, props.max)
      const overflow = Math.max(0, props.people.length - visible.length)
      return h('div', { class: cm.cn(cm.flex({ align: 'center' }), props.className) }, [
        ...visible.map((person, index) =>
          h('span', { key: index, style: index === 0 ? undefined : OVERLAP_MARGIN }, [
            h(Avatar, {
              src: person.src,
              alt: person.alt ?? person.name,
              name: person.name,
              size: props.size,
            }),
          ]),
        ),
        overflow > 0
          ? h(
              'span',
              {
                class: cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                ),
                style: OVERLAP_MARGIN,
                'aria-label': t(
                  'avatarStack.more',
                  { count: overflow },
                  { defaultValue: '+{{count}} more' },
                ),
              },
              // One text node, as React's two children read: the prefix, then the count.
              [`${t('avatarStack.overflowPrefix', undefined, { defaultValue: '+' })}${overflow}`],
            )
          : null,
      ])
    }
  },
})
