/**
 * Select component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { getIconDataUrl } from '@molecule/app-icons'
import type { SelectProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Select component.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps<string>>(
  (
    {
      options,
      value,
      onValueChange,
      size = 'md',
      label,
      placeholder,
      error,
      hint,
      clearable,
      className,
      style,
      testId,
      disabled,
      required,
      name,
      id,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const selectId = id || name

    const selectClasses = cm.cn(cm.select({ error: !!error, size }), cm.selectNative, className)

    // Group options by group property
    const groupedOptions = options.reduce<Record<string, typeof options>>((acc, option) => {
      const group = option.group || ''
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(option)
      return acc
    }, {})

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
      onChange?.(e as unknown as Event)
      onValueChange?.(e.target.value)
    }

    const renderOptions = (): React.ReactNode => {
      const groups = Object.entries(groupedOptions)

      if (groups.length === 1 && groups[0][0] === '') {
        // No groups, render flat options
        return groups[0][1].map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))
      }

      // Render grouped options
      return groups.map(([group, groupOptions]) => {
        if (group === '') {
          return groupOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))
        }

        return (
          <optgroup key={group} label={group}>
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )
      })
    }

    return (
      <div className={cm.inputWrapper}>
        {label && (
          <label
            htmlFor={selectId}
            className={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}
          >
            {label}
          </label>
        )}
        <div className={cm.inputInner}>
          <select
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            className={selectClasses}
            style={{
              ...style,
              backgroundImage: getIconDataUrl('chevron-down', '#6b7280'),
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
            }}
            data-testid={testId}
            onChange={handleChange}
            {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {clearable && <option value="">--</option>}
            {renderOptions()}
          </select>
        </div>
        {error && (
          <p id={`${selectId}-error`} className={cm.formError}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className={cm.formHint}>
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
