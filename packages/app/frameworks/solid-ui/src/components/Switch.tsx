/**
 * Switch component.
 *
 * @module
 */

import { onCleanup, onMount, splitProps } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SwitchProps } from '../types.js'
import {
  reactDomProps,
  reflectCheckedAtCreation,
  toStyleProps,
  type WithRef,
} from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

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
export const Switch = withDisplayName<WithRef<SwitchProps, HTMLButtonElement>>((props) => {
  const [local, rest] = splitProps(props, [
    'label',
    'checked',
    'size',
    'color',
    'className',
    'style',
    'testId',
    'name',
    'value',
    'required',
    'disabled',
    'onChange',
    'onCheckedChange',
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
    reflectCheckedAtCreation(input, !!local.checked)
    const listener = (event: Event): void => {
      const next = input.checked
      local.onChange?.(event)
      local.onCheckedChange?.(next)
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
        name={local.name}
        attr:value={local.value === undefined ? undefined : String(local.value)}
        required={local.required}
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
          {...reactDomProps(rest)}
        >
          <span data-state={state()} class={cm.switchThumb({ size: local.size ?? 'md' })} />
        </button>
        {/* React's `slot(label)`: a label that renders nothing adds no text. */}
        <PresentWhileNode node={local.label}>
          {(label) => <span class={cm.controlText}>{label()}</span>}
        </PresentWhileNode>
      </label>
    </>
  )
}, 'Switch')
