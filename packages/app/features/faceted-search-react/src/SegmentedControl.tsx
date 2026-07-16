/**
 * Pill-shaped segmented control. Two or more options; active option
 * gets the primary fill, inactive ones get a subtle hover.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SegmentedControlOption<T extends string> {
  value: T
  label: ReactNode
  dataMolId?: string
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (next: T) => void
  className?: string
}

/** Pill segmented control. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('p', 1),
        cm.roundedFull,
        'bg-surface-container-low',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          data-mol-id={opt.dataMolId}
          onClick={() => onChange(opt.value)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'py-1.5',
            opt.value === value
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControl
