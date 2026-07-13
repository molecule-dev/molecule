/**
 * Select component.
 *
 * @module
 */

import React, { forwardRef, useId } from 'react'

import { t } from '@molecule/app-i18n'
import type { SelectProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

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
    // Fall back to a generated id so label htmlFor / aria-describedby never
    // point at `undefined-error` (which also collides across multiple
    // id-less selects on the same page).
    const generatedId = useId()
    const selectId = id || name || generatedId

    const selectClasses = cm.cn(
      cm.select({ error: !!error, size }),
      cm.selectNative,
      cm.inputPadRight,
      className,
    )

    // The clearable "no selection" option shares value="" with the
    // placeholder option — rendering both produced two <option value="">
    // entries in the same <select>. Suppress the redundant one; the
    // placeholder already serves as the clear target.
    const showClearOption = clearable && !placeholder

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
            style={style}
            data-testid={testId}
            onChange={handleChange}
            {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {showClearOption && (
              <option value="">{t('ui.select.clear', undefined, { defaultValue: '--' })}</option>
            )}
            {renderOptions()}
          </select>
          {/* Chevron rendered as a real inline SVG (not a CSS backgroundImage
              data URI baked with a literal hex color) so it resolves
              `currentColor` from `cm.textMuted` and tracks the active theme,
              matching Input's rightElement icon treatment. `pointerEvents:
              'none'` is inline because it fills a gap ClassMap's
              `inputRightElement` doesn't address (that token is also used
              to host a real clickable clear-button elsewhere) — without it
              this purely decorative, absolutely-positioned overlay would
              swallow clicks on the select's own chevron-sized hit area. */}
          <div className={cm.inputRightElement} style={{ pointerEvents: 'none' }}>
            {renderIcon('chevron-down', cm.cn(cm.iconSm, cm.textMuted))}
          </div>
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
