/**
 * Switch component.
 *
 * @module
 */

import React, { forwardRef, useEffect, useRef } from 'react'

import type { SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Switch component.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { label, checked, size = 'md', color, className, style, testId, disabled, onChange, ...rest },
    ref,
  ) => {
    const cm = getClassMap()
    const state = checked ? 'checked' : 'unchecked'

    // A hidden, real native checkbox mirrors `checked` — `handleClick`
    // below calls `.click()` on it instead of forging a fake event object.
    // Its `change` is a GENUINE browser Event, so
    // `event.preventDefault()`/`event.stopPropagation()` are real methods
    // (no more "not a function" crash) and `event.target`/`currentTarget`
    // resolve to a real element with a real `.checked` — matching the
    // `(e.target as HTMLInputElement).checked` pattern every flagship
    // template's onChange already uses against this component. The old
    // `{ target: { checked } } as unknown as Event` cast happened to read
    // back OK for that one property but crashed on any real Event method.
    // Kept as a SIBLING of the visible <label> (not a descendant of it) —
    // both the checkbox and the <button> are "labelable" elements per the
    // HTML spec, so nesting both inside one <label> risks the browser's
    // native label-click-forwarding firing a SECOND, redundant click on
    // whichever one isn't the direct target.
    const hiddenInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      const input = hiddenInputRef.current
      if (!input || !onChange) return
      const listener = (event: Event): void => onChange(event)
      input.addEventListener('change', listener)
      return () => input.removeEventListener('change', listener)
    }, [onChange])

    const handleClick = (): void => {
      if (!disabled) {
        hiddenInputRef.current?.click()
      }
    }

    return (
      <>
        <input
          ref={hiddenInputRef}
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className={cm.srOnly}
          // Controlled input requires an onChange to silence React's
          // dev warning; the REAL forwarding to the caller happens through
          // the native `addEventListener('change', …)` above (a genuine
          // browser Event), not through this synthetic React handler.
          onChange={() => {}}
        />
        <label className={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
          <button
            ref={ref}
            type="button"
            role="switch"
            // `role="switch"` REQUIRES aria-checked; coerce so an
            // undefined/uncontrolled `checked` still announces "off" instead
            // of omitting the attribute (invalid ARIA, state unreadable).
            aria-checked={!!checked}
            disabled={disabled}
            data-state={state}
            onClick={handleClick}
            className={cm.cn(cm.switchBase({ size, color }), className)}
            style={style}
            data-testid={testId}
            {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <span data-state={state} className={cm.switchThumb({ size })} />
          </button>
          {!!label && <span className={cm.controlText}>{label as React.ReactNode}</span>}
        </label>
      </>
    )
  },
)

Switch.displayName = 'Switch'
