/**
 * Vue range slider with a tiny mono-font value chip on the right of the label
 * row — the section, the trailing value chip and the accent-primary track.
 *
 * Vue counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorSlider` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { NodeEditorSection } from './NodeEditorSection.js'
import type { NodeEditorSliderProps } from './types.js'

/**
 * Vue range slider — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider`.
 *
 * @param props - The label, the value, the range and the change handler.
 * @returns The range slider section.
 */
export const NodeEditorSlider = defineComponent({
  name: 'NodeEditorSlider',
  props: {
    label: null,
    value: { type: Number, required: true },
    onChange: {
      type: Function as PropType<NodeEditorSliderProps['onChange']>,
      required: true,
    },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1 },
    step: { type: Number, default: 0.1 },
    valueDisplay: null,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    // Names the range input through the section's `<label for>`.
    const inputId = useId()

    /**
     * Parses the range input's value, reports it, then restores the controlled
     * value in the DOM as React does after a change.
     *
     * @param event - The native change event.
     */
    const handleChange = (event: Event): void => {
      const element = event.target as HTMLInputElement
      props.onChange(parseFloat(element.value))
      element.value = String(props.value)
    }

    return (): VNode => {
      // React's `valueDisplay ?? value`; a slot supplies the node-valued form.
      const display: VNodeChild[] = slots.valueDisplay
        ? slots.valueDisplay()
        : props.valueDisplay != null && props.valueDisplay !== false
          ? [props.valueDisplay]
          : [props.value]

      return h(
        NodeEditorSection,
        { gap: 3, htmlFor: inputId },
        {
          label: () => (slots.label ? slots.label() : [props.label]),
          trailing: () => [
            h(
              'span',
              {
                class: cm.cn(cm.textSize('xs'), cm.sp('px', 2), cm.nodeEditorPanelSliderValue),
              },
              display,
            ),
          ],
          default: () => [
            h('input', {
              class: cm.cn(
                cm.w('full'),
                cm.h(1.5),
                cm.cursorPointer,
                cm.nodeEditorPanelSliderTrack,
              ),
              id: inputId,
              // React sets `aria-valuetext` from a string `valueDisplay`.
              'aria-valuetext':
                typeof props.valueDisplay === 'string' ? props.valueDisplay : undefined,
              min: props.min,
              max: props.max,
              step: props.step,
              type: 'range',
              value: String(props.value),
              defaultValue: String(props.value),
              onChange: handleChange,
            }),
          ],
        },
      )
    }
  },
})
