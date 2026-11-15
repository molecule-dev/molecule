/**
 * Vue job-board listing row.
 *
 * Vue counterpart of `@molecule/app-job-listing-row-react`'s `JobListingRow` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { JobListingRowProps } from './types.js'

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
 * Job-board row — title + company + location + type + salary + posted date
 * with optional leading logo, tag chips, and right-side actions.
 *
 * The location value is prefixed with the same hardcoded 📍 glyph React
 * renders, and the meta fields carry the same literal middle-dot separators
 * (there is no prop to change or localise them). `onClick` makes the whole
 * row clickable but renders no button semantics — supply your own
 * focus/keyboard affordance (or wrap the row in a button/link) when
 * click-to-open matters for a11y.
 *
 * @param props - Component props (see {@link JobListingRowProps}).
 * @returns The job listing row component.
 */
export const JobListingRow = defineComponent({
  name: 'JobListingRow',
  props: {
    title: null,
    company: null,
    location: null,
    type: null,
    salary: null,
    postedAt: null,
    leading: null,
    actions: null,
    tags: null,
    onClick: { type: Function as PropType<JobListingRowProps['onClick']>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const title = slotOrTruthy(slots.title, props.title)
      const company = slotOrTruthy(slots.company, props.company)
      const location = slotOrTruthy(slots.location, props.location)
      const type = slotOrTruthy(slots.type, props.type)
      const salary = slotOrTruthy(slots.salary, props.salary)
      const postedAt = slotOrTruthy(slots.postedAt, props.postedAt)
      const leading = slotOrTruthy(slots.leading, props.leading)
      const actions = slotOrTruthy(slots.actions, props.actions)
      const tags = slotOrTruthy(slots.tags, props.tags)
      return h(
        'div',
        {
          onClick: props.onClick,
          class: cm.cn(
            cm.flex({ align: 'start', gap: 'md' }),
            cm.sp('p', 3),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        [
          leading.length > 0 ? h('div', { class: cm.shrink0 }, leading) : null,
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title),
            company.length > 0 ? h('span', { class: cm.textSize('sm') }, company) : null,
            h('div', { class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }) }, [
              location.length > 0
                ? h('span', { class: cm.textSize('xs') }, ['📍 ', ...location])
                : null,
              type.length > 0 ? h('span', { class: cm.textSize('xs') }, ['· ', ...type]) : null,
              salary.length > 0
                ? h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                    '· ',
                    ...salary,
                  ])
                : null,
              postedAt.length > 0
                ? h('span', { class: cm.textSize('xs') }, ['· ', ...postedAt])
                : null,
            ]),
            tags.length > 0
              ? h('div', { class: cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }) }, tags)
              : null,
          ]),
          actions.length > 0
            ? h(
                'div',
                { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0) },
                actions,
              )
            : null,
        ],
      )
    }
  },
})
