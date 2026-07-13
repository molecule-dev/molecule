import { forwardRef, useId, useState } from 'react'

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
 *
 * The floating text is a real `<label htmlFor>` (not a bare `<span>`), so
 * it is the input's programmatic accessible name via label association —
 * previously the accessible name came only from `placeholder` (stripped by
 * some AT/browser combos once the field has a value), and clicking the
 * floating text did nothing because it wasn't associated with anything.
 * `id` falls back to `useId()` when the caller doesn't pass one, mirroring
 * Input/Select/Textarea's id-collision fix.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ placeholder, className, value: valueProp, onChange, defaultValue, id, ...props }, ref) => {
    const cm = getClassMap()
    const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
    const isControlled = valueProp !== undefined
    const value = isControlled ? valueProp : internalValue
    const generatedId = useId()
    const inputId = id || generatedId

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (!isControlled) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    return (
      <span className={cm.floatingInputWrapper}>
        <input
          ref={ref}
          id={inputId}
          {...props}
          placeholder={placeholder}
          className={cm.cn(cm.input(), cm.floatingInput, className)}
          value={value}
          onChange={handleChange}
        />
        {placeholder && (
          <label htmlFor={inputId} className={cm.floatingLabel}>
            {placeholder}
          </label>
        )}
      </span>
    )
  },
)
FloatingInput.displayName = 'FloatingInput'
