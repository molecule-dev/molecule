/**
 * Select component.
 *
 * @module
 */

import { forwardRef, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import type {
  SelectFieldOption,
  SelectFieldProps,
  SelectOption,
  SelectProps,
} from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'
import { Box, SelectField, Text } from '@molecule/app-ui-react/elements'

import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'

/** React Select props, including controlled and default arrays in multiple mode. */
type ReactSelectProps = {
  /** Browser translation metadata for literal labels, such as HTTP methods. */
  translate?: SelectFieldProps['translate']
} & (
  | (SelectProps<string> & {
      /** Initial selection when the caller does not hold the value. */
      defaultValue?: string
      onValuesChange?: never
    })
  | (Omit<SelectProps<string>, 'multiple' | 'value'> & {
      multiple: true
      /** Caller-owned selection. A legacy scalar selects the matching value. */
      value?: readonly string[] | string
      /** Initial selection when the caller does not hold the value. */
      defaultValue?: readonly string[] | string
      /** Every selected value in option order, after the event and scalar callback. */
      onValuesChange?: (values: readonly string[]) => void
    })
)

/** Select with an optional label, hint, validation error and grouped choices. */
export const Select = forwardRef<HTMLSelectElement, ReactSelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      multiple,
      onValueChange,
      onValuesChange,
      size = 'md',
      label,
      placeholder,
      error,
      hint,
      clearable,
      className,
      style,
      testId,
      disabled,
      required,
      name,
      id,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation()
    const cm = getClassMap()
    // A column around the label, the control's row and the message, so the control's margin
    // moves the control on every renderer (the same layout in every framework's kit).
    const field = fieldLayout(cm)
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less selects on the same page).
    const generatedId = useId()
    const selectId = id || name || generatedId

    const selectClasses = cm.cn(
      cm.select({ error: !!error, size }),
      cm.selectNative,
      cm.inputPadRight,
      className,
    )

    const leading = placeholder
      ? { value: '', label: placeholder, disabled: true }
      : clearable
        ? { value: '', label: t('ui.select.clear', undefined, { defaultValue: '--' }) }
        : undefined
    const controlProps = {
      ref,
      id: selectId,
      name,
      options: fieldOptions(options, leading),
      disabled,
      required,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined,
      className: selectClasses,
      webStyle: style,
      'data-testid': testId,
      onChange,
      ...rootProps(rest),
    }

    return (
      <Box as="div" className={field.root}>
        {label && (
          <Text
            as="label"
            htmlFor={selectId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </Text>
        )}
        <Box as="div" className={field.inner}>
          {multiple ? (
            <SelectField
              as="select"
              multiple
              {...(value === undefined
                ? { defaultValue: multipleValue(defaultValue) }
                : { value: multipleValue(value) })}
              onValueChange={(values) => {
                onValueChange?.(values[0] ?? '')
                onValuesChange?.(values)
              }}
              {...controlProps}
            />
          ) : (
            <SelectField
              as="select"
              multiple={multiple}
              {...(value === undefined ? { defaultValue } : { value })}
              onValueChange={onValueChange}
              {...controlProps}
            />
          )}
          <Box as="div" className={cm.inputRightElement} style={{ pointerEvents: 'none' }}>
            {renderIcon('chevron-down', cm.cn(cm.iconSm, cm.textMuted))}
          </Box>
        </Box>
        {error && (
          <Text as="p" id={`${selectId}-error`} className={cm.formError}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text as="p" id={`${selectId}-hint`} className={cm.formHint}>
            {hint}
          </Text>
        )}
      </Box>
    )
  },
)

Select.displayName = 'Select'

/** Adapts the kit's legacy scalar to the element's multiple selection shape. */
function multipleValue(
  value: string | readonly string[] | undefined,
): readonly string[] | undefined {
  return typeof value === 'string' ? [value] : value
}

/** Preserve the kit's object-key order, including integer-like labels and the ungrouped bucket. */
function fieldOptions(
  options: readonly SelectOption[],
  leading: SelectFieldOption | undefined,
): SelectFieldProps['options'] {
  const grouped: Record<string, SelectFieldOption[]> = Object.create(null)
  for (const option of options) (grouped[option.group || ''] ??= []).push(option)
  const ordered: SelectFieldProps['options'][number][] = leading ? [leading] : []
  for (const [label, leaves] of Object.entries(grouped)) {
    if (label) ordered.push({ label, options: leaves })
    else ordered.push(...leaves)
  }
  return ordered
}
