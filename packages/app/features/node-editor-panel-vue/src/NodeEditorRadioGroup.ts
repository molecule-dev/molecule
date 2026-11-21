/**
 * Vue radio list with the chatbot-builder's custom radio-dot rendering — each
 * option is a labeled tile around a visually hidden native radio sharing one
 * generated group name, so the set is a real radio group.
 *
 * Vue counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorRadioGroup` — the same props (React names), the same ClassMap
 * tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild, withDirectives } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorRadioGroupProps, NodeEditorRadioOption } from './types.js'
import { vControlledChecked } from './utilities.js'

/**
 * Source of the generated per-group radio name. The name only ties one group's
 * radios together (one checked at a time, one Tab stop), so any value unique to
 * the instance works; React's binding uses `useId()` for the same job.
 */
let nextGeneratedName = 0

/**
 * A fresh group name, unique to one radio group instance.
 *
 * @returns The generated name.
 */
const generatedName = (): string => `mol-node-editor-radio-${nextGeneratedName++}`

/**
 * Normalizes a node-valued label to a child list: a reactive proxy is unwrapped
 * (`toRaw`) so rendering it never writes back into the effect that produced it.
 *
 * @param value - The label.
 * @returns The children to render.
 */
const childList = (value: VNodeChild | null | undefined): VNodeChild[] => {
  if (value === null || value === undefined || value === false) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Radio list — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorRadioGroup`.
 *
 * @param props - The options, the selected value and the change handler.
 * @returns The radio list.
 */
export const NodeEditorRadioGroup = defineComponent({
  name: 'NodeEditorRadioGroup',
  props: {
    options: {
      type: Array as PropType<NodeEditorRadioOption<string>[]>,
      required: true,
    },
    value: { type: String, required: true },
    onChange: {
      type: Function as PropType<NodeEditorRadioGroupProps<string>['onChange']>,
      required: true,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const name = generatedName()

    /**
     * Reports the selected option, then restores the radio group's live
     * `checked` state to the controlled value — React restores controlled
     * inputs after an event even when the render output is unchanged.
     *
     * @param value - The option that was selected.
     * @param event - The native change event.
     */
    const handleChange = (value: string, event: Event): void => {
      props.onChange(value)
      const group = (event.target as HTMLElement).closest('[role="radiogroup"]')
      if (!group) return
      for (const input of Array.from(
        group.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
      )) {
        input.checked = input.value === props.value
      }
    }

    return (): VNode =>
      h(
        'div',
        { role: 'radiogroup', class: cm.cn(cm.grid({ cols: 1, gap: 2 })) },
        props.options.map((opt) => {
          const selected = opt.value === props.value
          return h(
            'label',
            {
              key: opt.value,
              'data-mol-id': `node-editor-radio-${opt.value}`,
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 3),
                cm.cursorPointer,
                selected ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
              ),
            },
            [
              withDirectives(
                h('input', {
                  type: 'radio',
                  name,
                  value: String(opt.value),
                  defaultValue: String(opt.value),
                  onChange: (event: Event) => handleChange(opt.value, event),
                  class: cm.srOnly,
                }),
                [[vControlledChecked, selected]],
              ),
              h(
                'span',
                {
                  class: cm.cn(
                    cm.textSize('xs'),
                    selected
                      ? cm.nodeEditorPanelOptionLabelSelected
                      : cm.nodeEditorPanelOptionLabel,
                  ),
                },
                childList(opt.label),
              ),
              h(
                'div',
                {
                  'aria-hidden': 'true',
                  class: cm.cn(
                    cm.nodeEditorPanelRadioRing,
                    selected
                      ? cm.nodeEditorPanelRadioRingSelected
                      : cm.nodeEditorPanelRadioRingIdle,
                  ),
                },
                [
                  selected
                    ? h('div', {
                        class: cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.bgPrimary),
                      })
                    : null,
                ],
              ),
            ],
          )
        }),
      )
  },
})
