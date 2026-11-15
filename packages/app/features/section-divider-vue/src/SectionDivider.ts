/**
 * Vue horizontal divider with an optional centered label.
 *
 * Vue counterpart of `@molecule/app-section-divider-react`'s `SectionDivider`
 * — the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Horizontal divider with an optional centered label, common as "OR" between
 * auth options, "Today" between feed days, "—" between sections.
 *
 * The label is the default slot; `align` positions it: `'center'` (default)
 * draws lines on both sides, `'start'` / `'end'` put the label at that edge
 * with a single line filling the rest. The frame and lines use ClassMap
 * tokens (`cm.flex`, `cm.flex1`, `cm.textSize`, `cm.fontWeight`) so the
 * styling library can be swapped without touching consumers.
 *
 * @param props - Component props (see {@link SectionDividerProps}).
 * @returns The section divider component.
 */
export const SectionDivider = defineComponent({
  name: 'SectionDivider',
  props: {
    align: {
      type: String as PropType<'start' | 'center' | 'end'>,
      default: 'center',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /** One flanking line: fills the remaining space beside the label. */
    const line = (): VNode =>
      h('span', {
        class: cm.flex1,
        'aria-hidden': 'true',
        style: { borderTop: '1px solid currentColor', opacity: 0.2 },
      })

    return (): VNode =>
      h(
        'div',
        {
          role: 'separator',
          'aria-orientation': 'horizontal',
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className),
        },
        [
          ...(props.align === 'center' || props.align === 'end' ? [line()] : []),
          ...(slots.default
            ? [
                h(
                  'span',
                  { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                  slots.default(),
                ),
              ]
            : []),
          ...(props.align === 'center' || props.align === 'start' ? [line()] : []),
        ],
      )
  },
})
