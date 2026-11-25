/**
 * SelectField: an ordered choice field.
 *
 * @module
 */

import { type ChangeEvent, createElement, forwardRef, type ReactElement } from 'react'

import type { ElementHandle, SelectFieldProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'

/**
 * Renders one browser select and forwards the actual select and change event.
 */
export const SelectField = forwardRef<ElementHandle, SelectFieldProps>(
  function SelectField(field, ref) {
    const { as, options, style, webStyle, onChange, onValueChange, ...attributes } = field
    return createElement(
      as,
      {
        ...attributes,
        ref: useElementRef<HTMLSelectElement>(ref),
        style: webElementStyle(style, webStyle),
        onChange:
          onChange || onValueChange || field.value !== undefined
            ? (event: ChangeEvent<HTMLSelectElement>): void => {
                onChange?.(event)
                if (field.multiple) {
                  field.onValueChange?.(
                    Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                  )
                } else {
                  field.onValueChange?.(event.currentTarget.value)
                }
              }
            : undefined,
      },
      renderOptions(options),
    )
  },
)

/** Keeps option nodes stable by value, including when the displayed language changes. */
function renderOptions(options: SelectFieldProps['options']): ReactElement[] {
  const valueCounts = new Map<string, number>()
  for (const option of options) {
    if (!('options' in option))
      valueCounts.set(option.value, (valueCounts.get(option.value) ?? 0) + 1)
  }
  const occurrences = new Map<string, number>()
  return options.map((option) => {
    const identity =
      'options' in option
        ? JSON.stringify(['group', option.label])
        : JSON.stringify([
            'option',
            option.value,
            (valueCounts.get(option.value) ?? 0) > 1 ? option.label : null,
          ])
    const occurrence = occurrences.get(identity) ?? 0
    occurrences.set(identity, occurrence + 1)
    const key = `${identity}:${occurrence}`
    return 'options' in option
      ? createElement('optgroup', { key, label: option.label }, renderOptions(option.options))
      : createElement(
          'option',
          { key, value: option.value, disabled: option.disabled },
          option.label,
        )
  })
}
