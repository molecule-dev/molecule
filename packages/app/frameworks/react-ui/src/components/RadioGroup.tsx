/**
 * RadioGroup component.
 *
 * @module
 */

import React, { forwardRef, useId } from 'react'

import { t } from '@molecule/app-i18n'
import type { RadioGroupProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * RadioGroup component.
 */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps<string>>(
  (
    {
      options,
      value,
      onChange,
      size: _size,
      label,
      name,
      direction = 'vertical',
      error,
      className,
      style,
      testId,
      disabled,
    },
    ref,
  ) => {
    const cm = getClassMap()
    // Radios only form a native group (arrow-key navigation, exclusive
    // native checked state) when they share a `name` — and that name must be
    // UNIQUE per group. The old `label`-as-name fallback merged every group
    // sharing a visible label (e.g. two "Size" pickers) into ONE native
    // group: selecting in one silently deselected the other. Callers that
    // need a specific submitted field name pass the `name` prop.
    const generatedName = useId()
    const groupName = name || generatedName
    const errorId = `${groupName}-error`

    const handleChange = (optionValue: string): void => {
      onChange?.(optionValue)
    }

    return (
      <div
        ref={ref}
        className={className}
        style={style}
        data-testid={testId}
        role="radiogroup"
        aria-label={label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {label && (
          <div className={cm.cn(cm.label({ required: false }), cm.sp('mb', 2))}>{label}</div>
        )}
        <div className={cm.radioGroupLayout(direction)}>
          {options.map((option) => {
            const isChecked = value === option.value
            const isDisabled = disabled || option.disabled

            return (
              <label
                key={option.value}
                className={cm.cn(cm.controlLabel, isDisabled && cm.controlDisabled)}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => handleChange(option.value)}
                  data-state={isChecked ? 'checked' : 'unchecked'}
                  className={cm.cn(cm.radio({ error: !!error }), cm.cursorPointer)}
                />
                <span className={cm.controlText}>{option.label as React.ReactNode}</span>
              </label>
            )
          })}
        </div>
        {error && (
          <p id={errorId} className={cm.cn(cm.formError, cm.sp('mt', 1))}>
            {error}
          </p>
        )}
      </div>
    )
  },
)

RadioGroup.displayName = 'RadioGroup'
