import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Select } from '@molecule/app-ui-react'

/**
 *
 */
export interface SortOption<T extends string = string> {
  value: T
  label: ReactNode
}

interface SortPickerProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SortOption<T>[]
  /** Optional label rendered above or to the left of the select. */
  label?: ReactNode
  /** Where to render the label. Defaults to `'inline'`. */
  labelPosition?: 'inline' | 'above'
  /** Extra classes. */
  className?: string
}

/**
 * Standalone sort-by selector. Thin wrapper around `<Select>` with a
 * conventional "Sort by:" label and a focused single-select API.
 *
 * Different from `<FilterBar>` which manages multiple filter fields.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.options
 * @param root0.label
 * @param root0.labelPosition
 * @param root0.className
 */
export function SortPicker<T extends string = string>({
  value,
  onChange,
  options,
  label,
  labelPosition = 'inline',
  className,
}: SortPickerProps<T>) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const labelText = label ?? t('sort.label', {}, { defaultValue: 'Sort by' })
  const select = (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as T)}
      options={options.map((o) => ({ value: o.value, label: String(o.label) }))}
      aria-label={typeof labelText === 'string' ? labelText : 'Sort by'}
    />
  )
  if (labelPosition === 'above') {
    return (
      <div className={cm.cn(cm.stack(1 as const), className)}>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{labelText}</span>
        {select}
      </div>
    )
  }
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      <span className={cm.textSize('sm')}>{labelText}:</span>
      {select}
    </div>
  )
}
