/**
 * Vue sticky-note style card.
 *
 * Vue counterpart of `@molecule/app-note-card-react`'s `NoteCard` — the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { type ColorVariant, getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { NoteCardProps } from './types.js'

/**
 * The open button's overlay reset: an empty, transparent native button over
 * the whole card (the same inline style React applies).
 */
const openButtonStyle = {
  background: 'transparent',
  border: 'none',
  padding: '0px',
}

/**
 * The note tints the theme covers, and the tone each one is: a note's colour
 * is chosen by the user, so a tint from this table renders as the theme's
 * light tint of its tone (`bgTone(tone, { subtle: true })`) and follows the
 * app theme. A colour not listed has no tone — it is data, applied as given.
 */
const TINT_TONES: Record<string, ColorVariant> = {
  '#fef9c3': 'warning', // yellow note
  '#fef3c7': 'warning', // amber note (the tint this card originally shipped with)
  '#dcfce7': 'success', // green note
  '#dbeafe': 'info', // blue note
  '#fee2e2': 'error', // red note
}

/**
 * Resolves a note tint to the tone whose light tint the theme renders for it.
 *
 * @param color - The `color` prop (any CSS colour).
 * @returns The tone, or undefined when the colour has no tone (data).
 */
const tintTone = (color: string | undefined): ColorVariant | undefined =>
  color === undefined ? undefined : TINT_TONES[color.trim().toLowerCase()]

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
 * The card's paper is a theme tone: the documented note tints (yellow
 * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
 * `#fef3c7`) render as the theme's light tint of the matching tone, so the
 * card and its text (the theme's ink) follow the app theme. A `color` with
 * no tone is data: it is applied as given, over the tone's paper. The
 * accessible label of the pin
 * indicator is the string React renders (`t('noteCard.aria.pinned', undefined,
 * { defaultValue: 'Pinned' })`), read through `useTranslation()` so it follows
 * a locale switch.
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
    const { t } = useTranslation()
    const cm = getClassMap()
    const nameId = useId()

    return (): VNode => {
      const title = slotOrTruthy(slots.title, props.title)
      const modifiedAt = slotOrTruthy(slots.modifiedAt, props.modifiedAt)
      const actions = slotOrTruthy(slots.actions, props.actions)
      const labelId = props.onClick ? nameId : undefined
      // The card's paper: the light tint of the note colour's tone, or the
      // warning paper when no colour is given. A colour with no tone is
      // data — it is applied as given, over the tone's paper. The text
      // inherits the theme's ink, readable on a theme tint in either mode.
      const tone = tintTone(props.color) ?? 'warning'
      const dataTint = tintTone(props.color) === undefined ? props.color : undefined
      const content: VNodeChild[] = [
        title.length > 0
          ? h('h3', { id: labelId, class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) }, title)
          : null,
        h(
          'div',
          {
            id: title.length > 0 ? undefined : labelId,
            class: cm.textSize('sm'),
            style: { whiteSpace: 'pre-wrap' },
          },
          slotOrTruthy(slots.body, props.body),
        ),
      ]
      return h(
        'article',
        {
          class: cm.cn(
            cm.stack(2),
            cm.sp('p', 3),
            cm.bgTone(tone, { subtle: true }),
            cm.shadowLifted,
            props.className,
          ),
          style: {
            background: dataTint,
            borderRadius: '8px',
            // The card owns its absolute children: the open button's overlay
            // and the pinned indicator both sit inside it.
            position: 'relative',
          },
        },
        [
          props.onClick
            ? h('button', {
                type: 'button',
                'aria-labelledby': nameId,
                'data-mol-id': 'note-card-open',
                onClick: () => props.onClick?.(),
                class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                style: openButtonStyle,
              })
            : null,
          props.pinned
            ? h(
                'span',
                {
                  role: 'img',
                  'aria-label': t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' }),
                  style: { position: 'absolute', top: '6px', right: '6px' },
                },
                '📌',
              )
            : null,
          ...content,
          modifiedAt.length > 0 || actions.length > 0
            ? h(
                'footer',
                {
                  class: cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    props.onClick ? cm.position('relative') : undefined,
                  ),
                },
                [
                  ...(modifiedAt.length > 0
                    ? [h('span', { class: cm.textSize('xs') }, modifiedAt)]
                    : []),
                  ...actions,
                ],
              )
            : null,
        ],
      )
    }
  },
})
