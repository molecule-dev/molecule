/**
 * Switch component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the Switch component.
 * @param props - The component props.
 * @returns The rendered switch JSX.
 */
export const Switch: Component<SwitchProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'label',
    'checked',
    'size',
    'color',
    'className',
    'style',
    'testId',
    'disabled',
    'onChange',
  ])

  const cm = getClassMap()
  const state = (): 'checked' | 'unchecked' => (local.checked ? 'checked' : 'unchecked')

  const handleClick = (): void => {
    if (!local.disabled) {
      // Simulate a change event
      const event = { target: { checked: !local.checked } } as unknown as Event
      local.onChange?.(event)
    }
  }

  return (
    <label class={cm.cn(cm.controlLabel, local.disabled && cm.controlDisabled)}>
      <button
        type="button"
        role="switch"
        aria-checked={local.checked}
        disabled={local.disabled}
        data-state={state()}
        onClick={handleClick}
        class={cm.cn(cm.switchBase({ size: local.size }), local.className)}
        style={local.style}
        data-testid={local.testId}
        {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <span data-state={state()} class={cm.switchThumb({ size: local.size })} />
      </button>
      <Show when={!!local.label}>
        <span class={cm.controlText}>{local.label as JSX.Element}</span>
      </Show>
    </label>
  )
}
