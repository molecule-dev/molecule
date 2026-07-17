import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Select } from '@molecule/app-ui-react'

/** A single option entry for the SortPicker select list. */
export interface SortOption<T extends string = string> {
  value: T
  /**
   * Option label. A native `<select>`/`<option>` can only display text,
   * so this is a plain `string` — it is rendered as the option's text
   * child (never `String()`-coerced). For a rich label above/beside the
   * control, use the {@link SortPickerProps.label} prop, which accepts a
   * `ReactNode`.
   */
  label: string
}

/** Props for the {@link SortPicker} component. */
export interface SortPickerProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SortOption<T>[]
  /**
   * Optional label rendered above or to the left of the select. Rendered
   * as JSX children, so a `ReactNode` (icon + text, styled element, …)
   * displays as nodes — it is never stringified. When you pass a
   * non-string node, also pass {@link SortPickerProps.ariaLabel} to give
   * the select an accessible name.
   */
  label?: ReactNode
  /**
   * Accessible name for the underlying `<select>`. Defaults to `label`
   * when it is a plain string, otherwise the translated "Sort by". Pass
   * this whenever `label` is a non-string `ReactNode` (a node cannot be
   * used as an `aria-label` attribute value).
   */
  ariaLabel?: string
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
 * @param props - Component props (see {@link SortPickerProps}).
 */
export function SortPicker<T extends string = string>({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  labelPosition = 'inline',
  className,
}: SortPickerProps<T>): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const defaultLabel = t('sort.label', {}, { defaultValue: 'Sort by' })
  const labelNode = label ?? defaultLabel
  // A ReactNode can never be an aria-label attribute value, so resolve a
  // plain string: an explicit `ariaLabel`, else the label when it is a
  // string, else the translated default. Never `String()` a node.
  const selectAriaLabel = ariaLabel ?? (typeof labelNode === 'string' ? labelNode : defaultLabel)
  const select = (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as T)}
      options={options}
      aria-label={selectAriaLabel}
    />
  )
  if (labelPosition === 'above') {
    return (
      <div className={cm.cn(cm.stack(1 as const), className)}>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{labelNode}</span>
        {select}
      </div>
    )
  }
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      <span className={cm.textSize('sm')}>{labelNode}:</span>
      {select}
    </div>
  )
}
