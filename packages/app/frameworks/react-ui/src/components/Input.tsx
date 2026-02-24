/**
 * Input component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { t } from '@molecule/app-i18n'
import type { InputProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Input component.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      label,
      error,
      hint,
      leftElement,
      rightElement,
      clearable,
      onClear,
      clearLabel,
      className,
      style,
      testId,
      disabled,
      required,
      value,
      defaultValue,
      placeholder,
      name,
      id,
      onChange,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const inputId = id || name

    const inputClasses = cm.cn(
      cm.input({ error: !!error, size }),
      !!leftElement && cm.inputPadLeft,
      !!(rightElement || clearable) && cm.inputPadRight,
      className,
    )

    return (
      <div className={cm.inputWrapper}>
        {label && (
          <label
            htmlFor={inputId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </label>
        )}
        <div className={cm.inputInner}>
          {!!leftElement && (
            <div className={cm.inputLeftElement}>{leftElement as React.ReactNode}</div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            name={name}
            value={value as string}
            defaultValue={defaultValue as string}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={inputClasses}
            style={style}
            data-testid={testId}
            onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
            onFocus={onFocus as unknown as React.FocusEventHandler<HTMLInputElement>}
            onBlur={onBlur as unknown as React.FocusEventHandler<HTMLInputElement>}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          />
          {(rightElement || (clearable && value)) && (
            <div className={cm.inputRightElement}>
              {clearable && value ? (
                <button
                  type="button"
                  onClick={onClear}
                  className={cm.inputClearButton}
                  aria-label={
                    clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })
                  }
                >
                  {renderIcon('x-mark', cm.iconSm)}
                </button>
              ) : (
                <span className={cm.textMuted}>{rightElement as React.ReactNode}</span>
              )}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={cm.formError}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className={cm.formHint}>
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
