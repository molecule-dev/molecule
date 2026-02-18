/**
 * RadioGroup component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

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
      >
        {label && <div className={cm.cn(cm.label({ required: false }), cm.sp('mb', 2))}>{label}</div>}
        <div
          className={cm.radioGroupLayout(direction)}
        >
          {options.map((option) => {
            const isChecked = value === option.value
            const isDisabled = disabled || option.disabled

            return (
              <label
                key={option.value}
                className={cm.cn(
                  cm.controlLabel,
                  isDisabled && cm.controlDisabled,
                )}
              >
                <input
                  type="radio"
                  name={label}
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
        {error && <p className={cm.cn(cm.formError, cm.sp('mt', 1))}>{error}</p>}
      </div>
    )
  },
)

RadioGroup.displayName = 'RadioGroup'
