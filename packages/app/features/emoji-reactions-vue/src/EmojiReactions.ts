/**
 * Vue emoji reaction bar: one toggle chip per existing reaction plus an
 * optional "+" quick-pick popover.
 *
 * Vue counterpart of `@molecule/app-emoji-reactions-react`'s
 * `EmojiReactions` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { EmojiReaction } from './types.js'

/** Quick picks offered when the caller does not pass `quickPicks`. */
const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

/**
 * A single toggle chip for one reaction. Owns its own hover/focus state so it
 * can reveal a custom tooltip (when `renderTooltip` is supplied) without a
 * shared parent listener.
 */
const ReactionChip = defineComponent({
  name: 'ReactionChip',
  props: {
    reaction: {
      type: Object as PropType<EmojiReaction>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<(emoji: string) => void>,
      default: undefined,
    },
    renderTooltip: {
      type: Function as PropType<(r: EmojiReaction) => VNodeChild>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const tipOpen = ref(false)

    return (): VNode => {
      const tip = props.renderTooltip?.(props.reaction)
      const hasTip = tip != null && tip !== false
      const tipId = hasTip ? `emoji-reaction-tip-${props.reaction.emoji}` : undefined
      return h('span', { class: cm.position('relative'), style: { display: 'inline-block' } }, [
        h(
          'button',
          {
            type: 'button',
            'data-mol-id': 'emoji-reaction',
            onClick: () => props.onToggle?.(props.reaction.emoji),
            onMouseenter: () => {
              tipOpen.value = true
            },
            onMouseleave: () => {
              tipOpen.value = false
            },
            onFocus: () => {
              tipOpen.value = true
            },
            onBlur: () => {
              tipOpen.value = false
            },
            'aria-pressed': props.reaction.reactedByMe,
            'aria-describedby': tipId,
            // Suppress the native title only when a richer tooltip is rendered.
            title: hasTip
              ? undefined
              : t(
                  'reactions.count',
                  { count: props.reaction.count },
                  { defaultValue: '{{count}} reactions' },
                ),
            class: cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.roundedFull,
            ),
            style: props.reaction.reactedByMe
              ? { outline: '1px solid currentColor', 'outline-offset': '-1px' }
              : undefined,
          },
          [
            h('span', { 'aria-hidden': 'true' }, props.reaction.emoji),
            h('span', {}, String(props.reaction.count)),
          ],
        ),
        hasTip
          ? h(
              'span',
              {
                role: 'tooltip',
                id: tipId,
                class: cm.cn(cm.tooltip(), cm.position('absolute')),
                style: {
                  bottom: 'calc(100% + 4px)',
                  left: '0px',
                  'pointer-events': 'none',
                  opacity: tipOpen.value ? 1 : 0,
                  visibility: tipOpen.value ? 'visible' : 'hidden',
                },
              },
              [tip],
            )
          : null,
      ])
    }
  },
})

/**
 * Generic emoji reaction bar — chip per existing reaction + an add
 * button that opens a quick-pick row. Different from
 * `MessageReactions` in `app-message-bubble-react` in being
 * standalone (not coupled to the message bubble layout).
 *
 * @param props - Component props (see {@link EmojiReactionsProps}).
 * @returns The reaction bar component.
 */
export const EmojiReactions = defineComponent({
  name: 'EmojiReactions',
  props: {
    reactions: {
      type: Array as PropType<EmojiReaction[]>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<(emoji: string) => void>,
      default: undefined,
    },
    quickPicks: {
      type: Array as PropType<string[]>,
      default: () => DEFAULT_PICKS,
    },
    onAdd: {
      type: Function as PropType<(emoji: string) => void>,
      default: undefined,
    },
    className: String,
    renderTooltip: {
      type: Function as PropType<(r: EmojiReaction) => VNodeChild>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const pickerOpen = ref(false)

    return (): VNode => {
      const picks = props.quickPicks ?? DEFAULT_PICKS
      return h(
        'div',
        { class: cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className) },
        [
          ...props.reactions.map((reaction) =>
            h(ReactionChip, {
              key: reaction.emoji,
              reaction,
              onToggle: props.onToggle,
              renderTooltip: props.renderTooltip,
            }),
          ),
          props.onAdd
            ? h('span', { class: cm.position('relative'), style: { display: 'inline-block' } }, [
                h(
                  'button',
                  {
                    type: 'button',
                    'data-mol-id': 'emoji-reaction-add',
                    onClick: () => {
                      pickerOpen.value = !pickerOpen.value
                    },
                    'aria-label': t('reactions.add', {}, { defaultValue: 'Add reaction' }),
                    // Icon-only `+` affordance in a dense chip row: bespoke look, but
                    // the compact 36px floor keeps it tappable.
                    class: cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.cursorPointer,
                      cm.touchTargetCompact,
                    ),
                  },
                  '+',
                ),
                pickerOpen.value
                  ? h(
                      'span',
                      {
                        class: cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('p', 1),
                          cm.position('absolute'),
                        ),
                        style: {
                          top: 'calc(100% + 4px)',
                          left: '0px',
                          zIndex: 50,
                          background: 'var(--mol-color-surface, #fff)',
                          border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        },
                      },
                      picks.map((emoji) =>
                        h(
                          'button',
                          {
                            key: emoji,
                            type: 'button',
                            'data-mol-id': 'emoji-reaction-pick',
                            onClick: () => {
                              props.onAdd?.(emoji)
                              pickerOpen.value = false
                            },
                            'aria-label': emoji,
                            class: cm.cn(
                              cm.sp('px', 1),
                              cm.sp('py', 1),
                              cm.textSize('base'),
                              cm.cursorPointer,
                              cm.touchTargetCompact,
                            ),
                          },
                          emoji,
                        ),
                      ),
                    )
                  : null,
              ])
            : null,
        ],
      )
    }
  },
})
