/**
 * Radio list with the chatbot-builder's custom radio-dot rendering.
 * Each option is a labeled tile with a 4×4 ring + 2×2 dot.
 *
 * Accessibility: each tile is a `<label>` around a visually hidden native
 * radio input, all sharing one generated `name`, so the set is a real radio
 * group: Tab enters it at the checked option, the arrow keys move the
 * selection, and screen readers announce "radio button, checked, 2 of 3". The
 * tile shows a focus ring while its radio has keyboard focus.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { useId } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** One selectable option in a {@link NodeEditorRadioGroup}. */
export interface NodeEditorRadioOption<T extends string> {
  value: T
  label: ReactNode
}

/** Props for {@link NodeEditorRadioGroup}. */
export interface NodeEditorRadioGroupProps<T extends string> {
  options: NodeEditorRadioOption<T>[]
  value: T
  onChange: (next: T) => void
}

/**
 * Radio list.
 *
 * Each option renders as a label tile around a visually hidden native radio,
 * so clicking the tile, the arrow keys and assistive technology all select it
 * the way they select any radio.
 *
 * @param props - The options, the selected value and the change handler.
 * @returns The radio list.
 */
export function NodeEditorRadioGroup<T extends string>({
  options,
  value,
  onChange,
}: NodeEditorRadioGroupProps<T>): JSX.Element {
  const cm = getClassMap()
  const name = useId()
  return (
    <div role="radiogroup" className={cm.cn(cm.grid({ cols: 1, gap: 2 }))}>
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <label
            key={opt.value}
            data-mol-id={`node-editor-radio-${opt.value}`}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 3),
              cm.cursorPointer,
              selected ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className={cm.srOnly}
            />
            <span
              className={cm.cn(
                cm.textSize('xs'),
                selected ? cm.nodeEditorPanelOptionLabelSelected : cm.nodeEditorPanelOptionLabel,
              )}
            >
              {opt.label}
            </span>
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.nodeEditorPanelRadioRing,
                selected ? cm.nodeEditorPanelRadioRingSelected : cm.nodeEditorPanelRadioRingIdle,
              )}
            >
              {selected ? (
                <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.bgPrimary)} />
              ) : null}
            </div>
          </label>
        )
      })}
    </div>
  )
}

export default NodeEditorRadioGroup
