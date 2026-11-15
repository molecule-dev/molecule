/**
 * Vue sticky-note style card.
 *
 * Vue counterpart of `@molecule/app-note-card-react`'s `NoteCard` — the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NoteCardProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot,
 * applying React's truthiness: the slot wins when present, and a falsy
 * string prop renders nothing (React's `{expr && <…>}` branch).
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
 * Sticky-note style card with optional color tint, pinned indicator, and
 * bottom-right actions. Use for note-taking apps, digital post-its,
 * dashboard quick-notes.
 *
 * The card intentionally keeps a paper-sticky-note look in BOTH themes: its
 * text color is fixed near-black, so `color` must be a LIGHT pastel — a dark
 * `color` value makes the body unreadable. The accessible label of the pin
 * indicator is the same literal React renders (`aria-label="Pinned"`); the
 * React package does not route it through i18n.
 *
 * @param props - Component props (see {@link NoteCardProps}).
 * @returns The note card component.
 */
export const NoteCard = defineComponent({
  name: 'NoteCard',
  props: {
    title: null,
    body: null,
    color: { type: String, default: undefined },
    pinned: { type: Boolean, default: undefined },
    modifiedAt: null,
    actions: null,
    onClick: { type: Function as PropType<NoteCardProps['onClick']>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = slotOrTruthy(slots.title, props.title)
      const modifiedAt = slotOrTruthy(slots.modifiedAt, props.modifiedAt)
      const actions = slotOrTruthy(slots.actions, props.actions)
      return h(
        'article',
        {
          onClick: props.onClick,
          class: cm.cn(
            cm.stack(2),
            cm.sp('p', 3),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
          style: {
            background: props.color ?? '#fef3c7',
            color: '#1f2937',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            position: 'relative',
          },
        },
        [
          props.pinned
            ? h(
                'span',
                {
                  'aria-label': 'Pinned',
                  style: { position: 'absolute', top: '6px', right: '6px' },
                },
                '📌',
              )
            : null,
          title.length > 0
            ? h('h3', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) }, title)
            : null,
          h(
            'div',
            { class: cm.textSize('sm'), style: { whiteSpace: 'pre-wrap' } },
            slotOrTruthy(slots.body, props.body),
          ),
          modifiedAt.length > 0 || actions.length > 0
            ? h('footer', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
                ...(modifiedAt.length > 0
                  ? [h('span', { class: cm.textSize('xs') }, modifiedAt)]
                  : []),
                ...actions,
              ])
            : null,
        ],
      )
    }
  },
})
