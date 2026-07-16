/**
 * Range slider with a tiny mono-font value chip on the right of the
 * label row. Renders the canonical 1.5-tall accent-primary track.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { NodeEditorSection } from './NodeEditorSection.js'

export interface NodeEditorSliderProps {
  label: ReactNode
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  /** Rendered as the trailing value chip; defaults to `value`. */
  valueDisplay?: ReactNode
}

/** Range slider section. */
export function NodeEditorSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  valueDisplay,
}: NodeEditorSliderProps): JSX.Element {
  const cm = getClassMap()
  return (
    <NodeEditorSection
      label={label}
      trailing={
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 2),
            'font-mono text-primary bg-primary/10 rounded',
          )}
        >
          {valueDisplay ?? value}
        </span>
      }
    >
      <input
        className={cm.cn(
          cm.w('full'),
          cm.h(1.5),
          cm.cursorPointer,
          'bg-surface-container-lowest rounded-lg appearance-none accent-primary',
        )}
        min={min}
        max={max}
        step={step}
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </NodeEditorSection>
  )
}

export default NodeEditorSlider
