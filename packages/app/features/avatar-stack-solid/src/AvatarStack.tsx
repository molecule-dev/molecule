/**
 * Solid horizontal stack of overlapping avatars.
 *
 * Solid counterpart of `@molecule/app-avatar-stack-react`'s `AvatarStack` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { AvatarStackProps } from './types.js'

/**
 * Negative left margin that pulls each avatar over its predecessor so the
 * stack visually overlaps. This is an inline style deliberately: the
 * ClassMap spacing scale (`SpacingScale`) is `0…24`, all non-negative, so
 * neither `cm.sp('ml', n)` nor its compound style form can express a
 * negative margin — one of the sanctioned "ClassMap can't express it"
 * inline-style cases. `-0.5rem` mirrors the intended `-2` Tailwind spacing
 * step. Solid takes kebab-case style keys.
 */
const OVERLAP_MARGIN: JSX.CSSProperties = { 'margin-left': '-0.5rem' }

/**
 * Horizontal stack of overlapping avatars (assignees, attendees, etc.).
 *
 * Renders up to `max` avatars; any remaining are summarised as `+N` in a
 * trailing chip. The chip's accessible name (`avatarStack.more`) and its
 * visible prefix (`avatarStack.overflowPrefix`) come from `useTranslation()`,
 * so the chip follows the active locale.
 *
 * @param props - Component props (see {@link AvatarStackProps}).
 * @returns The rendered avatar stack.
 */
export const AvatarStack: Component<AvatarStackProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = (): number => props.max ?? 4
  const size = (): 'xs' | 'sm' | 'md' | 'lg' => props.size ?? 'sm'
  const visible = (): AvatarStackProps['people'] => props.people.slice(0, max())
  const overflow = (): number => Math.max(0, props.people.length - visible().length)

  return (
    <div class={cm.cn(cm.flex({ align: 'center' }), props.className)}>
      <For each={visible()}>
        {(person, index): JSX.Element => (
          <span style={index() === 0 ? undefined : OVERLAP_MARGIN}>
            <Avatar
              src={person.src}
              alt={person.alt ?? person.name}
              name={person.name}
              size={size()}
            />
          </span>
        )}
      </For>
      <Show when={overflow() > 0}>
        <span
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
          )}
          style={OVERLAP_MARGIN}
          aria-label={t(
            'avatarStack.more',
            { count: overflow() },
            { defaultValue: '+{{count}} more' },
          )}
        >
          {t('avatarStack.overflowPrefix', undefined, { defaultValue: '+' })}
          {overflow()}
        </span>
      </Show>
    </div>
  )
}
