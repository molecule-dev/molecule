/**
 * Vue leaderboard row: rank + avatar + name + score + optional rank-delta
 * arrow.
 *
 * Vue counterpart of `@molecule/app-leaderboard-row-react`'s
 * `LeaderboardRow` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'

/** The medal emoji rendered in place of the rank for the top three. */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The nodes to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Whether an optional node-valued prop renders at all: React's
 * `{subtitle && <span>}` truthiness on the prop, plus a same-named slot being
 * present.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the subtitle span renders.
 */
const hasNode = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => slot != null || (prop != null && prop !== '' && prop !== false)

/**
 * Leaderboard row — rank + avatar + name + score + optional rank-delta
 * arrow. Top 3 ranks render a medal in place of the numeric rank. Ranks 1–3
 * render medal emoji instead of the rank number; there is no prop to disable
 * them. When `name` is not a plain string the Avatar's accessible name falls
 * back to 'Player'. `onClick` gives the row a pointer cursor but no keyboard
 * or role semantics. Node-valued props (`name`, `score`, `subtitle`) arrive
 * as a prop AND a same-named slot; the component accepts either.
 *
 * @param props - Component props (see {@link LeaderboardRowProps}).
 * @returns The leaderboard row component.
 */
export const LeaderboardRow = defineComponent({
  name: 'LeaderboardRow',
  props: {
    rank: { type: Number, required: true },
    name: null,
    avatarSrc: { type: String, default: undefined },
    score: null,
    rankDelta: { type: Number, default: undefined },
    subtitle: null,
    isMe: { type: Boolean, default: undefined },
    onClick: { type: Function as PropType<() => void>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const displayName = typeof props.name === 'string' ? props.name : 'Player'
      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
          style: props.isMe
            ? { background: 'rgba(96,165,250,0.1)', borderRadius: '8px' }
            : undefined,
          onClick: props.onClick,
        },
        [
          h(
            'span',
            {
              class: cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter),
              // React's `{ minWidth: 32 }` renders `min-width: 32px`.
              style: { minWidth: '32px' },
            },
            MEDAL[props.rank] ?? `#${props.rank}`,
          ),
          h(Avatar, { src: props.avatarSrc, alt: displayName, name: displayName, size: 'sm' }),
          h('div', { class: cm.cn(cm.flex1, cm.stack(0 as const)) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
              slotOrProp(slots.name, props.name),
            ),
            // React's `{subtitle && …}`: a falsy subtitle renders nothing.
            ...(hasNode(slots.subtitle, props.subtitle)
              ? [
                  h(
                    'span',
                    { class: cm.textSize('xs') },
                    slotOrProp(slots.subtitle, props.subtitle),
                  ),
                ]
              : []),
          ]),
          // React's `rankDelta !== undefined && rankDelta !== 0`: a zero delta renders nothing.
          ...(props.rankDelta !== undefined && props.rankDelta !== 0
            ? [
                h(
                  'span',
                  {
                    class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
                    style: { color: props.rankDelta > 0 ? '#22c55e' : '#ef4444' },
                  },
                  [props.rankDelta > 0 ? '▲' : '▼', ' ', String(Math.abs(props.rankDelta))],
                ),
              ]
            : []),
          h(
            'span',
            { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) },
            slotOrProp(slots.score, props.score),
          ),
        ],
      )
    }
  },
})
