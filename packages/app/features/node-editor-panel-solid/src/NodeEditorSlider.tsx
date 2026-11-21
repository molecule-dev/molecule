/**
 * Solid range slider with a tiny mono-font value chip on the right of the
 * label row — the section, the trailing value chip and the accent-primary
 * track.
 *
 * Solid counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorSlider` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createEffect, createUniqueId } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { NodeEditorSection } from './NodeEditorSection.jsx'
import type { NodeEditorSliderProps } from './types.js'

/**
 * Solid range slider — the Solid counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSlider`.
 *
 * @param props - The label, the value, the range and the change handler.
 * @returns The rendered range slider section.
 */
export const NodeEditorSlider: Component<NodeEditorSliderProps> = (props) => {
  const cm = getClassMap()
  // Names the range input through the section's `<label for>`.
  const inputId = createUniqueId()
  let inputEl: HTMLInputElement | undefined

  // React keeps a controlled range input's live value on the prop, in the DOM
  // property AND the `value` attribute (its `defaultValue`), both at mount and
  // whenever the prop changes.
  createEffect(() => {
    const element = inputEl
    if (!element) return
    const text = String(props.value)
    if (element.value !== text) element.value = text
    if (element.defaultValue !== text) element.defaultValue = text
  })

  /**
   * Parses the range input's value, reports it, then restores the controlled
   * value in the DOM as React does after a change.
   *
   * @param event - The native change event.
   */
  const handleChange = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const element = event.currentTarget
    props.onChange(parseFloat(element.value))
    element.value = String(props.value)
  }

  return (
    <NodeEditorSection
      gap={3}
      label={props.label}
      htmlFor={inputId}
      trailing={
        <span class={cm.cn(cm.textSize('xs'), cm.sp('px', 2), cm.nodeEditorPanelSliderValue)}>
          {props.valueDisplay ?? props.value}
        </span>
      }
    >
      <input
        ref={(element) => {
          inputEl = element
        }}
        id={inputId}
        aria-valuetext={typeof props.valueDisplay === 'string' ? props.valueDisplay : undefined}
        class={cm.cn(cm.w('full'), cm.h(1.5), cm.cursorPointer, cm.nodeEditorPanelSliderTrack)}
        min={props.min ?? 0}
        max={props.max ?? 1}
        step={props.step ?? 0.1}
        type="range"
        onChange={handleChange}
      />
    </NodeEditorSection>
  )
}
