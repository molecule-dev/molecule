/**
 * Vue message reaction chips: one button per reaction plus an optional "+"
 * button.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s
 * `MessageReactions` — the same props (React names), the same DOM for the same
 * input. The viewer's own reaction is marked with `aria-pressed` only.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { MessageReaction } from './types.js'

/**
 * Row of reaction chips below a message body. Each chip shows emoji +
 * count; when the current user reacted the chip is marked with
 * `aria-pressed` only — no visual highlight ships.
 *
 * @param props - Component props (see {@link MessageReactionsProps}).
 * @returns The reaction row component.
 */
export const MessageReactions = defineComponent({
  name: 'MessageReactions',
  props: {
    reactions: {
      type: Array as PropType<MessageReaction[]>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<(emoji: string) => void>,
      default: undefined,
    },
    onAdd: {
      type: Function as PropType<(event: Event) => void>,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        { class: cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className) },
        [
          ...props.reactions.map((reaction) =>
            h(
              'button',
              {
                key: reaction.emoji,
                type: 'button',
                'aria-pressed': reaction.reactedByMe,
                onClick: () => props.onToggle?.(reaction.emoji),
                class: cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.roundedFull,
                ),
              },
              [h('span', {}, reaction.emoji), h('span', {}, String(reaction.count))],
            ),
          ),
          props.onAdd
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: (event: MouseEvent) => props.onAdd?.(event),
                  class: cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs')),
                },
                '+',
              )
            : null,
        ],
      )
  },
})
