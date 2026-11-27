/**
 * FloatingInput component.
 *
 * @module
 */

import { forwardRef, useId, useState } from 'react'

import type { FloatingInputProps, TextFieldProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text, TextField } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 *
 * Works as both a controlled and an uncontrolled input: when `value` is
 * omitted, the component tracks its own state seeded from `defaultValue`
 * and still forwards every `onChange` event to the caller.
 *
 * The floating text is a real `<label htmlFor>` (not a bare `<span>`), so
 * it is the input's programmatic accessible name via label association —
 * previously the accessible name came only from `placeholder` (stripped by
 * some AT/browser combos once the field has a value), and clicking the
 * floating text did nothing because it wasn't associated with anything.
 * `id` falls back to `useId()` when the caller doesn't pass one, mirroring
 * Input/Select/Textarea's id-collision fix.
 */
export const FloatingInput = forwardRef<
  HTMLInputElement,
  FloatingInputProps & Pick<TextFieldProps, 'onValueChange'>
>(
  (
    {
      placeholder,
      className,
      style,
      testId,
      value: valueProp,
      onChange,
      onValueChange,
      defaultValue,
      id,
      ...props
    },
    ref,
  ) => {
    const cm = getClassMap()
    const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
    const isControlled = valueProp !== undefined
    const value = isControlled ? String(valueProp) : internalValue
    const generatedId = useId()
    const inputId = id || generatedId

    const handleValueChange = (text: string): void => {
      if (!isControlled) setInternalValue(text)
      onValueChange?.(text)
    }

    return (
      <Box as="span" className={cm.floatingInputWrapper}>
        <TextField
          as="input"
          ref={ref}
          id={inputId}
          data-testid={testId}
          {...rootProps(props)}
          placeholder={placeholder}
          className={cm.cn(cm.input(), cm.floatingInput, className)}
          webStyle={style}
          value={value}
          onChange={onChange}
          onValueChange={handleValueChange}
        />
        {placeholder && (
          <Text as="label" htmlFor={inputId} className={cm.floatingLabel}>
            {placeholder}
          </Text>
        )}
      </Box>
    )
  },
)
FloatingInput.displayName = 'FloatingInput'
