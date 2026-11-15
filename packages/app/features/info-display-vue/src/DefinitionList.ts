/**
 * Vue structured label/value pair list — the counterpart of
 * `@molecule/app-info-display-react`'s `DefinitionList`: the same props (React
 * names), the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { DefinitionField } from './types.js'

/**
 * Normalizes a node-valued prop into the children array Vue renders: an array
 * of nodes stays a list, everything else is a single child.
 *
 * @param value - The prop value (a VNode, a list of VNodes, text, or absent).
 * @returns The children to render.
 */
const asChildren = (value: VNodeChild): VNodeChild[] =>
  Array.isArray(value) ? value : value == null || value === false ? [] : [value]

/**
 * Structured label/value pair list. Use standalone or inside `<InfoCard>`. Apps
 * pass already-formatted values (dates, currency, status pills, etc.) as nodes.
 *
 * `columns={1}` stacks each label above its value; `2`/`3` arrange the fields in
 * a grid. The list uses ClassMap tokens only, so the styling library can be
 * swapped without touching consumers.
 *
 * @param props - Component props (see {@link DefinitionListProps}).
 * @returns The definition list component.
 */
export const DefinitionList = defineComponent({
  name: 'DefinitionList',
  props: {
    fields: {
      type: Array as PropType<DefinitionField[]>,
      required: true,
    },
    columns: {
      type: Number as PropType<1 | 2 | 3>,
      default: 1,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      // The fields carry node values. When they arrive through a reactive
      // container (the conformance kit's prop bag, or an app's reactive state)
      // reading them yields proxies, and Vue writes `el` onto every VNode it
      // mounts — a write through the proxy would re-trigger the render that is
      // reading it. `toRaw` hands the renderer the plain nodes.
      const fields = toRaw(props.fields) as DefinitionField[]

      return h(
        'dl',
        {
          class: cm.cn(
            props.columns === 1 ? cm.stack(3) : cm.grid({ cols: props.columns, gap: 'md' }),
            props.className,
          ),
        },
        fields.map((field, index) =>
          h('div', { key: index, class: cm.stack(0 as const) }, [
            h(
              'dt',
              {
                class: cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                ),
              },
              [...asChildren(field.icon), h('span', asChildren(field.label))],
            ),
            h('dd', { class: cm.textSize('sm') }, asChildren(field.value)),
          ]),
        ),
      )
    }
  },
})
