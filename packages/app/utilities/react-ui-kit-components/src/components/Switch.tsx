/**
 * Toggle with a labelled control and a checkbox that owns its form state.
 *
 * @module
 */

import { forwardRef, useMemo, useRef } from 'react'

import { slot } from '@molecule/app-react/render'
import type { CheckFieldHandle, ElementHandle, KitMouseEvent, SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { mergeRefs } from '../utilities/mergeRefs.js'
import { renderNode } from '../utilities/renderNode.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Binds the switch tree and its hidden form input to the host.
 * @param hosts - The labelled control and its child elements.
 * @returns The Switch component.
 */
export function createSwitch(
  hosts: Pick<KitHosts, 'Box' | 'CheckField' | 'SwitchButton' | 'Text'>,
): KitComponent<SwitchProps> {
  const { Box, CheckField, SwitchButton, Text } = hosts
  const Switch = forwardRef<ElementHandle, SwitchProps>(function Switch(
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
      onCheckedChange,
      onClick,
      name,
      value,
      required,
      ...rest
    },
    ref,
  ) {
    const label = slot(renderNode(labelProp))
    const cm = getClassMap()
    const state = checked ? 'checked' : 'unchecked'
    const input = useRef<CheckFieldHandle>(null)
    const button = useRef<ElementHandle>(null)
    const setButton = useMemo(() => mergeRefs(ref, button), [ref])

    const toggle = (): void => {
      if (!disabled) input.current?.click()
    }
    const handleClick = (event: KitMouseEvent): void => {
      onClick?.(event)
      if (!event.defaultPrevented) toggle()
    }

    return (
      <>
        <CheckField
          as="input"
          ref={input}
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          name={name}
          value={value === undefined ? undefined : String(value)}
          required={required}
          aria-hidden="true"
          tabIndex={-1}
          className={cm.srOnly}
          nativeChangeEvent
          onChange={onChange}
          onCheckedChange={onCheckedChange}
          formFocus={() => button.current?.focus()}
        />
        <Box as="label" className={cm.cn(cm.controlLabel, disabled && cm.controlDisabled)}>
          <SwitchButton
            as="button"
            ref={setButton}
            type="button"
            role="switch"
            aria-checked={!!checked}
            disabled={disabled}
            data-state={state}
            onClick={handleClick}
            toggle={toggle}
            className={cm.cn(cm.switchBase({ size, color }), className)}
            webStyle={style}
            data-testid={testId}
            {...rootProps(rest)}
          >
            <Box as="span" data-state={state} className={cm.switchThumb({ size })} />
          </SwitchButton>
          {!!label && (
            <Text as="span" className={cm.controlText}>
              {label}
            </Text>
          )}
        </Box>
      </>
    )
  })
  Switch.displayName = 'Switch'
  return Switch
}
