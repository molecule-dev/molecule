/**
 * Switch component.
 *
 * @module
 */

import React, { forwardRef, useRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { CheckFieldHandle, KitMouseEvent, SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, CheckField, Pressable, Text } from '@molecule/app-ui-react/elements'

import { rootProps } from '../utilities/rootProps.js'

/**
 * Switch component.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      label: labelProp,
      checked,
      size = 'md',
      color,
      className,
      style,
      testId,
      disabled,
      onChange,
      onClick,
      value,
      ...rest
    },
    ref,
  ) => {
    const label = slot(labelProp as React.ReactNode)
    const cm = getClassMap()
    const state = checked ? 'checked' : 'unchecked'

    // Keep the hidden input beside the label so the button is its only labelable child.
    const hiddenInputRef = useRef<CheckFieldHandle>(null)

    // A caller's onClick runs first and can veto the toggle with
    // preventDefault(); it used to be spread over this handler, so passing
    // one silently disabled the switch.
    const handleClick = (event: KitMouseEvent): void => {
      onClick?.(event)
      if (!disabled && !event.defaultPrevented) {
        hiddenInputRef.current?.click()
      }
    }

    return (
      <>
        <CheckField
          as="input"
          ref={hiddenInputRef}
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className={cm.srOnly}
          nativeChangeEvent
          onChange={onChange}
        />
        <Box as="label" className={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
          <Pressable
            as="button"
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
            webStyle={style}
            data-testid={testId}
            value={value === undefined ? undefined : String(value)}
            {...rootProps(rest)}
          >
            <Box as="span" data-state={state} className={cm.switchThumb({ size })} />
          </Pressable>
          {!!label && (
            <Text as="span" className={cm.controlText}>
              {label}
            </Text>
          )}
        </Box>
      </>
    )
  },
)

Switch.displayName = 'Switch'
