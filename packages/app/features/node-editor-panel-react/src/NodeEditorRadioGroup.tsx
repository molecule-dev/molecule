/**
 * Radio list with the chatbot-builder's custom radio-dot rendering.
 * Each option is a labeled tile with a 4×4 ring + 2×2 dot.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

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

/** Radio list. */
export function NodeEditorRadioGroup<T extends string>({
  options,
  value,
  onChange,
}: NodeEditorRadioGroupProps<T>): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 2 }))}>
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <label
            key={opt.value}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 3),
              cm.cursorPointer,
              selected ? cm.nodeEditorPanelOptionSelected : cm.nodeEditorPanelOption,
            )}
            onClick={() => onChange(opt.value)}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                selected ? cm.nodeEditorPanelOptionLabelSelected : cm.nodeEditorPanelOptionLabel,
              )}
            >
              {opt.label}
            </span>
            <div
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
