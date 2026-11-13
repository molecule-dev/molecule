/**
 * Switch component.
 *
 * @module
 */

import { type Component, type JSX, onCleanup, onMount, Show, splitProps } from 'solid-js'

import type { SwitchProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the Switch component.
 *
 * A hidden, real native checkbox mirrors `checked` — the click handler
 * below calls `.click()` on it instead of forging a fake event object.
 * Its `change` is a GENUINE browser Event, so `event.preventDefault()` /
 * `event.stopPropagation()` are real methods (no more "not a function"
 * crash) and `event.target`/`currentTarget` resolve to a real element with
 * a real `.checked`. Kept as a SIBLING of the visible `<label>` (not a
 * descendant of it) — both the checkbox and the `<button>` are "labelable"
 * elements per the HTML spec, so nesting both inside one `<label>` risks
 * the browser's native label-click-forwarding firing a SECOND, redundant
 * click on whichever one isn't the direct target.
 *
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
    'onClick',
  ])

  const cm = getClassMap()
  const state = (): string => (local.checked ? 'checked' : 'unchecked')

  let hiddenInput: HTMLInputElement | undefined

  // Attached on mount, before any user interaction can reach the input, and
  // reading the latest `onChange` at call time. The hidden input's `checked`
  // attribute mirrors the prop (React renders it as a boolean attribute at
  // mount); the property stays live through the JSX binding. A controlled
  // switch restores the prop value after the event (React does the same).
  onMount(() => {
    const input = hiddenInput
    if (!input) return
    if (local.checked) input.setAttribute('checked', '')
    const listener = (event: Event): void => {
      ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
      input.checked = !!local.checked
    }
    input.addEventListener('change', listener)
    onCleanup(() => input.removeEventListener('change', listener))
  })

  // A caller's onClick runs first and can veto the toggle with
  // preventDefault(); it used to be spread over this handler, so passing
  // one silently disabled the switch.
  const handleClick = (event: MouseEvent & { currentTarget: HTMLButtonElement }): void => {
    ;(local.onClick as ((event: MouseEvent) => void) | undefined)?.(event)
    if (!local.disabled && !event.defaultPrevented) {
      hiddenInput?.click()
    }
  }

  return (
    <>
      <input
        ref={(el) => {
          hiddenInput = el
        }}
        type="checkbox"
        checked={!!local.checked}
        disabled={local.disabled}
        aria-hidden="true"
        tabindex={-1}
        class={cm.srOnly}
      />
      <label class={cm.cn(cm.controlLabel, local.disabled && cm.controlDisabled)}>
        <button
          type="button"
          role="switch"
          // `role="switch"` REQUIRES aria-checked; coerce so an
          // undefined/uncontrolled `checked` still announces "off" instead
          // of omitting the attribute (invalid ARIA, state unreadable).
          aria-checked={!!local.checked}
          disabled={local.disabled}
          data-state={state()}
          onClick={handleClick}
          class={cm.cn(
            cm.switchBase({ size: local.size ?? 'md', color: local.color }),
            local.className,
          )}
          style={toStyleProps(local.style)}
          data-testid={local.testId}
          {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <span data-state={state()} class={cm.switchThumb({ size: local.size ?? 'md' })} />
        </button>
        <Show when={local.label}>
          <span class={cm.controlText}>{local.label as JSX.Element}</span>
        </Show>
      </label>
    </>
  )
}
