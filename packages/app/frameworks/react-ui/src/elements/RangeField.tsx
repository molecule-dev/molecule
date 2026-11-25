/**
 * RangeField: a platform numeric slider.
 *
 * @module
 */

import { type ChangeEvent, createElement, forwardRef } from 'react'

import type { ElementHandle, RangeFieldProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'

/**
 * Renders one browser range input and reports its numeric value on each edit.
 */
export const RangeField = forwardRef<ElementHandle, RangeFieldProps>(
  function RangeField(props, ref) {
    const { onValueChange } = props
    return createElement(
      'input',
      webElementAttributes(
        props,
        {
          type: 'range',
          ref: useElementRef<HTMLInputElement>(ref),
          onChange:
            onValueChange || props.value !== undefined
              ? (event: ChangeEvent<HTMLInputElement>): void => {
                  onValueChange?.(event.currentTarget.valueAsNumber)
                }
              : undefined,
        },
        { onValueChange: 'onChange' },
      ),
    )
  },
)
