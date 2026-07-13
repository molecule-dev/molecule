/**
 * Checkbox component.
 *
 * @module
 */

import React, { forwardRef, useCallback, useEffect, useId, useRef } from 'react'

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
    // Always track the node in internalRef (for the indeterminate DOM flag)
    // AND forward it to the caller's ref. The previous `(ref || internalRef)
    // as RefObject` cast silently broke `indeterminate` whenever the caller
    // passed a CALLBACK ref (functions have no `.current`).
    const internalRef = useRef<HTMLInputElement | null>(null)
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    const cm = getClassMap()
    const checkboxId = id || name
    // The error message must be programmatically associated with the input
    // (like Input/Textarea/Select already do) — a bare sibling <p> is never
    // announced by screen readers, so the failure reason was invisible.
    const generatedId = useId()
    const errorId = `${checkboxId || generatedId}-error`

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate
      }
    }, [indeterminate])

    const checkboxClasses = cm.cn(cm.checkbox({ error: !!error }), className)

    return (
      <div className={cm.formFieldWrapper}>
        <label className={cm.controlLabel}>
          <input
            ref={setRefs}
            type="checkbox"
            id={checkboxId}
            name={name}
            checked={checked}
            disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
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
        {error && (
          <p id={errorId} className={cm.cn(cm.formError, cm.sp('mt', 1))}>
            {error}
          </p>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
