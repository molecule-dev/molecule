/**
 * Input component.
 *
 * @module
 */

import React, { forwardRef, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { InputProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text, TextField } from '@molecule/app-ui-react/elements'

import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Input component.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      align,
      label,
      error,
      hint,
      leftElement: leftElementProp,
      rightElement: rightElementProp,
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
    const leftElement = slot(leftElementProp as React.ReactNode)
    const rightElement = slot(rightElementProp as React.ReactNode)
    const { t } = useTranslation()
    const cm = getClassMap()
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less inputs on the same page).
    const generatedId = useId()
    const inputId = id || name || generatedId

    const inputClasses = cm.cn(
      cm.input({ error: !!error, size, align }),
      !!leftElement && cm.inputPadLeft,
      !!(rightElement || clearable) && cm.inputPadRight,
      className,
    )

    return (
      <Box as="div" className={cm.inputWrapper}>
        {label && (
          <Text
            as="label"
            htmlFor={inputId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </Text>
        )}
        <Box as="div" className={cm.inputInner}>
          {!!leftElement && (
            <Box as="div" className={cm.inputLeftElement}>
              {leftElement}
            </Box>
          )}
          <TextField
            as="input"
            ref={ref}
            type={type}
            id={inputId}
            name={name}
            value={fieldText(value)}
            defaultValue={fieldText(defaultValue)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={inputClasses}
            webStyle={style}
            data-testid={testId}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            {...rootProps(rest)}
          />
          {(rightElement || (clearable && value)) && (
            <Box as="div" className={cm.inputRightElement}>
              {clearable && value ? (
                <Pressable
                  as="button"
                  type="button"
                  onClick={onClear}
                  className={cm.inputClearButton}
                  aria-label={
                    clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })
                  }
                >
                  {renderIcon('x-mark', cm.iconSm)}
                </Pressable>
              ) : (
                <Box as="span" className={cm.textMuted}>
                  {rightElement}
                </Box>
              )}
            </Box>
          )}
        </Box>
        {error && (
          <Text as="p" id={`${inputId}-error`} className={cm.formError}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text as="p" id={`${inputId}-hint`} className={cm.formHint}>
            {hint}
          </Text>
        )}
      </Box>
    )
  },
)

/**
 * An input's value as the text its field holds (a number or a list reads as the DOM writes it).
 *
 * @param value - The value.
 * @returns The text, or `undefined` for none.
 */
function fieldText(value: InputProps['value']): string | undefined {
  return value === undefined ? undefined : String(value)
}

Input.displayName = 'Input'
