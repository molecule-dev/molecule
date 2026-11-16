/**
 * Vue job-board listing row.
 *
 * Vue counterpart of `@molecule/app-job-listing-row-react`'s `JobListingRow` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

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
 * (there is no prop to change or localise them). `onClick` covers the whole
 * row with an empty, transparent native button that activates it — the whole
 * row is the click target, named by the title (the `<h3>` itself takes the id
 * the button points at with `aria-labelledby`), with the inner controls above
 * it keeping their own clicks.
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
    // The row's accessible name lives on the title, the way React's useId()
    // names it: the open button points at the `<h3>` with aria-labelledby.
    const nameId = useId()

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
          class: cm.cn(
            cm.flex({ align: 'start', gap: 'md' }),
            cm.sp('p', 3),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
        },
        [
          // The row's open control: an empty, transparent native button over
          // the whole row (Enter / Space activate it natively), a SIBLING of
          // the slot wrappers rather than their parent. mol-bespoke-button:
          // the whole row is the hit area, not a CTA; the inline background/
          // border/padding are native resets.
          props.onClick
            ? h('button', {
                type: 'button',
                'aria-labelledby': nameId,
                'data-mol-id': 'job-listing-row-open',
                onClick: () => props.onClick?.(),
                class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                style: { background: 'transparent', border: 'none', padding: 0 },
              })
            : null,
          leading.length > 0 ? h('div', { class: cm.shrink0 }, leading) : null,
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h(
              'h3',
              { id: nameId, class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
              title,
            ),
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
              ? h(
                  'div',
                  {
                    class: cm.cn(
                      cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                      cm.position('relative'),
                    ),
                  },
                  tags,
                )
              : null,
          ]),
          actions.length > 0
            ? h(
                'div',
                {
                  class: cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.shrink0,
                    cm.position('relative'),
                  ),
                },
                actions,
              )
            : null,
        ],
      )
    }
  },
})
