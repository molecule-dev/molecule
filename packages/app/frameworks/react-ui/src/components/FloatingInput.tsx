import { forwardRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

type FloatingInputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * An input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 *
 * Works as both a controlled and an uncontrolled input: when `value` is
 * omitted, the component tracks its own state seeded from `defaultValue`
 * and still forwards every `onChange` event to the caller.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ placeholder, className, value: valueProp, onChange, defaultValue, ...props }, ref) => {
    const cm = getClassMap()
    const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
    const isControlled = valueProp !== undefined
    const value = isControlled ? valueProp : internalValue

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    return (
      <span className={cm.floatingInputWrapper}>
        <input
          ref={ref}
          {...props}
          placeholder={placeholder}
          className={cm.cn(cm.input(), cm.floatingInput, className)}
          value={value}
          onChange={handleChange}
        />
        {placeholder && <span className={cm.floatingLabel}>{placeholder}</span>}
      </span>
    )
  },
)
FloatingInput.displayName = 'FloatingInput'
