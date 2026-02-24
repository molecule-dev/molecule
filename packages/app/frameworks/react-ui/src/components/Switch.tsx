/**
 * Switch component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Switch component.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      label,
      checked,
      size = 'md',
      color: _color,
      className,
      style,
      testId,
      disabled,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    const state = checked ? 'checked' : 'unchecked'

    const handleClick = (): void => {
      if (!disabled) {
        // Simulate a change event
        const event = { target: { checked: !checked } } as unknown as Event
        onChange?.(event)
      }
    }

    return (
      <label className={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          data-state={state}
          onClick={handleClick}
          className={cm.cn(cm.switchBase({ size }), className)}
          style={style}
          data-testid={testId}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <span data-state={state} className={cm.switchThumb({ size })} />
        </button>
        {!!label && <span className={cm.controlText}>{label as React.ReactNode}</span>}
      </label>
    )
  },
)

Switch.displayName = 'Switch'
