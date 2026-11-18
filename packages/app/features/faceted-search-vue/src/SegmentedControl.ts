/**
 * Vue pill-shaped segmented control.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { childrenOf } from './node.js'

/**
 * One entry of a {@link SegmentedControl}'s `options` list.
 *
 * @internal
 */
interface SegmentedControlOption<T extends string> {
  /** The value the segment reports. */
  value: T
  /** Display label: text or any node. */
  label: VNodeChild
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Pill-shaped segmented control. Two or more options; the active option gets
 * the primary fill, inactive ones get a subtle hover.
 *
 * Vue counterpart of `@molecule/app-faceted-search-react`'s `SegmentedControl`
 * — the same props (React names), the same ClassMap tokens, the same DOM for
 * the same input, and the same `onChange` calls.
 *
 * @param props - Component props (see {@link SegmentedControlProps}).
 * @returns The segmented-control component.
 */
export const SegmentedControl = defineComponent({
  name: 'SegmentedControl',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the row.
  inheritAttrs: false,
  props: {
    options: {
      type: Array as PropType<SegmentedControlOption<string>[]>,
      required: true,
    },
    value: {
      type: String as PropType<string>,
      required: true,
    },
    onChange: {
      type: Function as PropType<(next: string) => void>,
      required: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          role: 'tablist',
          class: cm.cn(cm.tabsList({ variant: 'solid-rounded', size: 'sm' }), props.className),
        },
        props.options.map((opt) =>
          h(
            'button',
            {
              key: opt.value,
              type: 'button',
              role: 'tab',
              'aria-selected': opt.value === props.value ? 'true' : 'false',
              // `tabsTrigger` keys its selected styling off `data-state`.
              'data-state': opt.value === props.value ? 'active' : 'inactive',
              'data-mol-id': opt.dataMolId,
              onClick: () => {
                props.onChange(opt.value)
              },
              class: cm.cn(
                cm.tabsTrigger({ variant: 'solid-rounded', size: 'sm' }),
                cm.fontWeight('semibold'),
                cm.touchTargetCompact,
              ),
            },
            childrenOf(opt.label),
          ),
        ),
      )
  },
})
