/**
 * Checkbox component.
 *
 * @module
 */

import { type Component, createEffect, createUniqueId, type JSX, Show, splitProps } from 'solid-js'

import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the Checkbox component.
 * @param props - The component props.
 * @returns The rendered checkbox JSX.
 */
export const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'label',
    'checked',
    'indeterminate',
    'size',
    'error',
    'className',
    'style',
    'testId',
    'disabled',
    'name',
    'id',
    'onChange',
  ])

  let inputRef: HTMLInputElement | undefined

  const cm = getClassMap()
  const checkboxId = (): string | undefined => local.id || local.name
  // The error message must be programmatically associated with the input
  // (like Input/Textarea/Select already do) — a bare sibling <p> is never
  // announced by screen readers, so the failure reason was invisible.
  const generatedId = createUniqueId()
  const errorId = (): string => `${checkboxId() || generatedId}-error`

  createEffect(() => {
    if (inputRef) {
      inputRef.indeterminate = !!local.indeterminate
      // React renders `checked` as a boolean ATTRIBUTE on first mount (and
      // re-syncs it on controlled updates); the JSX binding keeps the live
      // property in step.
      if (local.checked === true) inputRef.setAttribute('checked', '')
      else if (local.checked === false) inputRef.removeAttribute('checked')
    }
  })

  const checkboxClasses = (): string =>
    cm.cn(cm.checkbox({ error: !!local.error }), local.className)

  // React's checkbox onChange fires on the `click` event; a controlled
  // checkbox restores the prop value after the event when the caller does
  // not adopt the toggled one.
  const handleClick = (event: MouseEvent & { currentTarget: HTMLInputElement }): void => {
    ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
    if (local.checked !== undefined) event.currentTarget.checked = !!local.checked
  }

  return (
    <div class={cm.formFieldWrapper}>
      <label class={cm.controlLabel}>
        <input
          ref={(el) => {
            inputRef = el
          }}
          type="checkbox"
          id={checkboxId()}
          name={local.name}
          checked={local.checked}
          disabled={local.disabled}
          data-state={local.checked ? 'checked' : 'unchecked'}
          aria-invalid={!!local.error}
          aria-describedby={local.error ? errorId() : undefined}
          class={checkboxClasses()}
          style={toStyleProps(local.style)}
          data-testid={local.testId}
          onClick={handleClick}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
        <Show when={local.label}>
          <span class={cm.cn(cm.controlText, local.disabled && cm.controlDisabled)}>
            {local.label as JSX.Element}
          </span>
        </Show>
      </label>
      <Show when={local.error}>
        <p id={errorId()} class={cm.cn(cm.formError, cm.sp('mt', 1))}>
          {local.error}
        </p>
      </Show>
    </div>
  )
}
