/**
 * RangeField: a platform numeric slider.
 *
 * @module
 */

import { type ChangeEvent, createElement, forwardRef } from 'react'

import type { ElementHandle, RangeFieldProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'

/**
 * Renders one browser range input and reports its numeric value on each edit.
 */
export const RangeField = forwardRef<ElementHandle, RangeFieldProps>(function RangeField(
  { onValueChange, style, webStyle, ...props },
  ref,
) {
  return createElement('input', {
    type: 'range',
    ...props,
    ref: useElementRef<HTMLInputElement>(ref),
    style: webElementStyle(style, webStyle),
    onChange:
      onValueChange || props.value !== undefined
        ? (event: ChangeEvent<HTMLInputElement>): void => {
            onValueChange?.(event.currentTarget.valueAsNumber)
          }
        : undefined,
  })
})
