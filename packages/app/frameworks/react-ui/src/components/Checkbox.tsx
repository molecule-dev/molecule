/**
 * Checkbox component.
 *
 * @module
 */

import React, { forwardRef, useEffect, useRef } from 'react'

import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Checkbox component.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
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
      onChange,
      ...rest
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)
    const checkboxRef = (ref || internalRef) as React.RefObject<HTMLInputElement>

    const cm = getClassMap()
    const checkboxId = id || name

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = !!indeterminate
      }
    }, [indeterminate])

    const checkboxClasses = cm.cn(cm.checkbox({ error: !!error }), className)

    return (
      <div className={cm.formFieldWrapper}>
        <label className={cm.controlLabel}>
          <input
            ref={checkboxRef}
            type="checkbox"
            id={checkboxId}
            name={name}
            checked={checked}
            disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            aria-invalid={!!error}
            className={checkboxClasses}
            style={style}
            data-testid={testId}
            onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          />
          {!!label && (
            <span className={cm.cn(cm.controlText, disabled && cm.controlDisabled)}>
              {label as React.ReactNode}
            </span>
          )}
        </label>
        {error && <p className={cm.cn(cm.formError, cm.sp('mt', 1))}>{error}</p>}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
