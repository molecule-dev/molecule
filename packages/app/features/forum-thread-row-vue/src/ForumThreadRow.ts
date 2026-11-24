/**
 * Vue forum / discussion-board thread row.
 *
 * Vue counterpart of `@molecule/app-forum-thread-row-react`'s `ForumThreadRow` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

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
  if (slot) return toChildArray(slot())
  return prop != null ? toChildArray(prop) : []
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
  if (slot) return toChildArray(slot())
  return prop ? toChildArray(prop) : []
}

/**
 * Forum / discussion-board thread row. Shows the title, optional excerpt, vote
 * score + reply/view counts, pin/lock badges, author, and timestamp. Pass
 * `voteControls` to render up/down buttons inline.
 *
 * The marker labels ("Pinned" / "Locked", announced through `role="img"` +
 * `aria-label`) and the counter labels ("votes", "{{count}} replies",
 * "{{count}} views") go through `t()` with those English defaults — the same
 * text, through the same keys, React renders. The row has no root
 * `data-mol-id` prop, exactly like React.
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
    const { t } = useTranslation()
    const cm = getClassMap()
    // The open button is named by the title: the id goes on the `<h3>` itself,
    // so the row's accessible name is the thread title.
    const nameId = useId()

    return (): VNode => {
      // The row's own text, through the same keys React renders (read in the
      // render function, so a locale switch re-renders).
      const pinnedLabel = t('forumThreadRow.aria.pinned', undefined, { defaultValue: 'Pinned' })
      const lockedLabel = t('forumThreadRow.aria.locked', undefined, { defaultValue: 'Locked' })
      const votesLabel = t('forumThreadRow.label.votes', undefined, { defaultValue: 'votes' })
      const repliesText =
        props.replyCount === undefined
          ? undefined
          : t(
              'forumThreadRow.label.replies',
              { count: props.replyCount },
              {
                defaultValue: '{{count}} replies',
              },
            )
      const viewsText =
        props.viewCount === undefined
          ? undefined
          : t(
              'forumThreadRow.label.views',
              { count: props.viewCount },
              {
                defaultValue: '{{count}} views',
              },
            )
      const title = slotOrValue(slots.title, props.title)
      const excerpt = slotOrTruthy(slots.excerpt, props.excerpt)
      const author = slotOrTruthy(slots.author, props.author)
      const createdAt = slotOrTruthy(slots.createdAt, props.createdAt)
      const tags = slotOrTruthy(slots.tags, props.tags)
      const voteControls = slotOrTruthy(slots.voteControls, props.voteControls)

      return h(
        'article',
        {
          class: cm.cn(
            cm.flex({ align: 'start', gap: 'sm' }),
            cm.sp('p', 3),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
        },
        [
          props.onClick
            ? h(
                'button',
                {
                  type: 'button',
                  'aria-labelledby': nameId,
                  'data-mol-id': 'forum-thread-row-open',
                  onClick: () => props.onClick?.(),
                  // The whole row is the hit area, not a CTA — an empty,
                  // transparent button over the row; the inline background/
                  // border/padding are native resets.
                  class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                  style: { background: 'transparent', border: 'none', padding: 0 },
                },
                [],
              )
            : null,
          voteControls.length > 0
            ? h(
                'div',
                {
                  class: cm.cn(cm.shrink0, props.onClick ? cm.position('relative') : undefined),
                },
                voteControls,
              )
            : null,
          props.voteScore !== undefined && voteControls.length === 0
            ? h('div', { class: cm.cn(cm.shrink0, cm.textCenter, cm.stack(0)) }, [
                h('span', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) }, [
                  String(props.voteScore),
                ]),
                h('span', { class: cm.textSize('xs') }, [votesLabel]),
              ])
            : null,
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h('header', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
              props.pinned
                ? h('span', { role: 'img', 'aria-label': pinnedLabel, title: pinnedLabel }, ['📌'])
                : null,
              props.locked
                ? h('span', { role: 'img', 'aria-label': lockedLabel, title: lockedLabel }, ['🔒'])
                : null,
              h(
                'h3',
                {
                  id: props.onClick ? nameId : undefined,
                  class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')),
                },
                title,
              ),
            ]),
            excerpt.length > 0 ? h('p', { class: cm.textSize('sm') }, excerpt) : null,
            h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
              author.length > 0
                ? h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, author)
                : null,
              createdAt.length > 0
                ? h('span', { class: cm.textSize('xs') }, ['· ', ...createdAt])
                : null,
              repliesText !== undefined
                ? h('span', { class: cm.textSize('xs') }, ['· ', repliesText])
                : null,
              viewsText !== undefined
                ? h('span', { class: cm.textSize('xs') }, ['· ', viewsText])
                : null,
            ]),
            tags.length > 0
              ? h(
                  'div',
                  {
                    class: cm.cn(
                      cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                      props.onClick ? cm.position('relative') : undefined,
                    ),
                  },
                  tags,
                )
              : null,
          ]),
        ],
      )
    }
  },
})
