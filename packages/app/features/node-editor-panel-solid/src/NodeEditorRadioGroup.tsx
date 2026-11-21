/**
 * Solid radio list with the chatbot-builder's custom radio-dot rendering —
 * each option is a labeled tile around a visually hidden native radio sharing
 * one generated group name, so the set is a real radio group.
 *
 * Solid counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorRadioGroup` — the same props (React names), the same ClassMap
 * tokens and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createMemo, For, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorRadioGroupProps, NodeEditorRadioOption } from './types.js'
import { reflectCheckedAtCreation } from './utilities.js'

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
 * Radio list — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorRadioGroup`.
 *
 * @param props - The options, the selected value and the change handler.
 * @returns The rendered radio list.
 */
export const NodeEditorRadioGroup: Component<NodeEditorRadioGroupProps<string>> = (props) => {
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

  // React keys the option rows by value, so a row's DOM node survives a props
  // update while its value is unchanged. Solid's `<For>` compares strings by
  // value, so iterate the values and read each option through a by-value map.
  const optionValues = createMemo((): string[] => props.options.map((option) => option.value))
  const optionByValue = createMemo((): Map<string, NodeEditorRadioOption<string>> => {
    const byValue = new Map<string, NodeEditorRadioOption<string>>()
    for (const option of props.options) byValue.set(option.value, option)
    return byValue
  })

  return (
    <div role="radiogroup" class={cm.cn(cm.grid({ cols: 1, gap: 2 }))}>
      <For each={optionValues()}>
        {(value) => {
          const option = (): NodeEditorRadioOption<string> => optionByValue().get(value)!
          const selected = (): boolean => value === props.value
          return (
            <label
              data-mol-id={`node-editor-radio-${value}`}
              class={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 3),
                cm.cursorPointer,
                selected() ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
              )}
            >
              <input
                ref={(element) => {
                  // React writes both the `value` property and its reflected
                  // attribute on creation; Solid's `value` binding writes only
                  // the property.
                  element.value = value
                  element.setAttribute('value', value)
                  reflectCheckedAtCreation(element, selected())
                }}
                type="radio"
                name={name}
                checked={selected()}
                onChange={(event: Event) => handleChange(value, event)}
                class={cm.srOnly}
              />
              <span
                class={cm.cn(
                  cm.textSize('xs'),
                  selected()
                    ? cm.nodeEditorPanelOptionLabelSelected
                    : cm.nodeEditorPanelOptionLabel,
                )}
              >
                {option().label}
              </span>
              <div
                aria-hidden="true"
                class={cm.cn(
                  cm.nodeEditorPanelRadioRing,
                  selected()
                    ? cm.nodeEditorPanelRadioRingSelected
                    : cm.nodeEditorPanelRadioRingIdle,
                )}
              >
                <Show when={selected()}>
                  <div class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.bgPrimary)} />
                </Show>
              </div>
            </label>
          )
        }}
      </For>
    </div>
  )
}
