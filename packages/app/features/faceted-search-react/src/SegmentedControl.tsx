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

/** Props for {@link SegmentedControl}. */
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
      role="tablist"
      className={cm.cn(cm.tabsList({ variant: 'solid-rounded', size: 'sm' }), className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          // `tabsTrigger` keys its selected styling off `data-state`, so the
          // segment's look comes entirely from the design system.
          data-state={opt.value === value ? 'active' : 'inactive'}
          data-mol-id={opt.dataMolId}
          onClick={() => onChange(opt.value)}
          className={cm.cn(
            cm.tabsTrigger({ variant: 'solid-rounded', size: 'sm' }),
            cm.fontWeight('semibold'),
            cm.touchTargetCompact,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControl
