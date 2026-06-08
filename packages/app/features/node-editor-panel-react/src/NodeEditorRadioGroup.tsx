/**
 * Radio list with the chatbot-builder's custom radio-dot rendering.
 * Each option is a labeled tile with a 4×4 ring + 2×2 dot.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface NodeEditorRadioOption<T extends string> {
  value: T
  label: ReactNode
}

interface NodeEditorRadioGroupProps<T extends string> {
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
              selected
                ? 'bg-surface-container-lowest rounded-xl hover:bg-surface-container-highest transition-colors group'
                : 'bg-surface-container-lowest/50 rounded-xl hover:bg-surface-container-highest transition-colors',
            )}
            onClick={() => onChange(opt.value)}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                selected ? 'text-on-surface' : 'text-on-surface-variant',
              )}
            >
              {opt.label}
            </span>
            <div
              className={cm.cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                selected ? 'border-primary' : 'border-outline-variant',
              )}
            >
              {selected ? (
                <div className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')} />
              ) : null}
            </div>
          </label>
        )
      })}
    </div>
  )
}

export default NodeEditorRadioGroup
