/**
 * Vue forum / discussion-board thread row.
 *
 * Vue counterpart of `@molecule/app-forum-thread-row-react`'s `ForumThreadRow` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { ForumThreadRowProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins when present, and an absent value contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrValue = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Resolves a node-valued prop with React's truthiness: the slot wins when
 * present, and a falsy prop renders nothing (React's `{expr && <…>}` branch).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrTruthy = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop ? [prop] : []
}

/**
 * Forum / discussion-board thread row. Shows the title, optional excerpt, vote
 * score + reply/view counts, pin/lock badges, author, and timestamp. Pass
 * `voteControls` to render up/down buttons inline.
 *
 * The counter labels ("votes", "replies", "views") and the pin/lock
 * aria-labels are the same hardcoded English React renders (React has no
 * companion locale bond yet); the row has no `data-mol-id` support, exactly
 * like React.
 *
 * @param props - Component props (see {@link ForumThreadRowProps}).
 * @returns The thread row component.
 */
export const ForumThreadRow = defineComponent({
  name: 'ForumThreadRow',
  props: {
    title: null,
    excerpt: null,
    voteScore: { type: Number, default: undefined },
    replyCount: { type: Number, default: undefined },
    viewCount: { type: Number, default: undefined },
    pinned: { type: Boolean, default: undefined },
    locked: { type: Boolean, default: undefined },
    author: null,
    createdAt: null,
    tags: null,
    voteControls: null,
    onClick: { type: Function as PropType<ForumThreadRowProps['onClick']>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = slotOrValue(slots.title, props.title)
      const excerpt = slotOrTruthy(slots.excerpt, props.excerpt)
      const author = slotOrTruthy(slots.author, props.author)
      const createdAt = slotOrTruthy(slots.createdAt, props.createdAt)
      const tags = slotOrTruthy(slots.tags, props.tags)
      const voteControls = slotOrTruthy(slots.voteControls, props.voteControls)
      return h(
        'article',
        {
          onClick: props.onClick,
          class: cm.cn(
            cm.flex({ align: 'start', gap: 'sm' }),
            cm.sp('p', 3),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        [
          voteControls.length > 0 ? h('div', { class: cm.shrink0 }, voteControls) : null,
          props.voteScore !== undefined && voteControls.length === 0
            ? h('div', { class: cm.cn(cm.shrink0, cm.textCenter, cm.stack(0)) }, [
                h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) }, [
                  String(props.voteScore),
                ]),
                h('span', { class: cm.textSize('xs') }, ['votes']),
              ])
            : null,
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h('header', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
              props.pinned ? h('span', { 'aria-label': 'Pinned', title: 'Pinned' }, ['📌']) : null,
              props.locked ? h('span', { 'aria-label': 'Locked', title: 'Locked' }, ['🔒']) : null,
              h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title),
            ]),
            excerpt.length > 0 ? h('p', { class: cm.textSize('sm') }, excerpt) : null,
            h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
              author.length > 0
                ? h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, author)
                : null,
              createdAt.length > 0
                ? h('span', { class: cm.textSize('xs') }, ['· ', ...createdAt])
                : null,
              props.replyCount !== undefined
                ? h('span', { class: cm.textSize('xs') }, [
                    '· ',
                    String(props.replyCount),
                    ' replies',
                  ])
                : null,
              props.viewCount !== undefined
                ? h('span', { class: cm.textSize('xs') }, ['· ', String(props.viewCount), ' views'])
                : null,
            ]),
            tags.length > 0
              ? h('div', { class: cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }) }, tags)
              : null,
          ]),
        ],
      )
    }
  },
})
