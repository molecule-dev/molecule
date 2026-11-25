/**
 * Checkbox component.
 *
 * @module
 */

import React, { forwardRef, useId } from 'react'

import { slot } from '@molecule/app-react/render'
import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, CheckField, Text } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

/**
 * Checkbox component.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label: labelProp,
      checked,
      indeterminate,
      size: _size,
      error,
      className,
      style,
      testId,
      disabled,
      name,
      id,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const label = slot(labelProp as React.ReactNode)
    const cm = getClassMap()
    const checkboxId = id || name
    // The error message must be programmatically associated with the input
    // (like Input/Textarea/Select already do) — a bare sibling <p> is never
    // announced by screen readers, so the failure reason was invisible.
    const generatedId = useId()
    const errorId = `${checkboxId || generatedId}-error`

    const checkboxClasses = cm.cn(cm.checkbox({ error: !!error }), className)

    return (
      <Box as="div" className={cm.formFieldWrapper}>
        <Box as="label" className={cm.controlLabel}>
          <CheckField
            as="input"
            ref={ref}
            type="checkbox"
            id={checkboxId}
            name={name}
            checked={checked}
            indeterminate={indeterminate}
            value={value === undefined ? undefined : String(value)}
            disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={checkboxClasses}
            webStyle={style}
            data-testid={testId}
            onChange={onChange}
            {...rootProps(rest)}
          />
          {!!label && (
            <Text as="span" className={cm.cn(cm.controlText, disabled && cm.controlDisabled)}>
              {label}
            </Text>
          )}
        </Box>
        {error && (
          <Text as="p" id={errorId} className={cm.cn(cm.formError, cm.sp('mt', 1))}>
            {error}
          </Text>
        )}
      </Box>
    )
  },
)

Checkbox.displayName = 'Checkbox'
