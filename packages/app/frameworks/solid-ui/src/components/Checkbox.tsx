/**
 * Checkbox component.
 *
 * @module
 */

import { createEffect, createUniqueId, Show, splitProps } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CheckboxProps } from '../types.js'
import {
  reactDomProps,
  reflectCheckedAtCreation,
  toStyleProps,
  type WithRef,
} from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Checkbox component.
 * @param props - The component props.
 * @returns The rendered checkbox JSX.
 */
export const Checkbox = withDisplayName<WithRef<CheckboxProps, HTMLInputElement>>((props) => {
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
    'onCheckedChange',
    'onClick',
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
    if (inputRef) inputRef.indeterminate = !!local.indeterminate
  })

  const checkboxClasses = (): string =>
    cm.cn(cm.checkbox({ error: !!local.error }), local.className)

  // React's checkbox onChange fires on the `click` event, after the caller's
  // onClick (whose preventDefault() makes the browser restore the box); a
  // controlled checkbox restores the prop value after the event when the
  // caller does not adopt the toggled one.
  const handleClick = (event: MouseEvent & { currentTarget: HTMLInputElement }): void => {
    local.onClick?.(event)
    const next = event.currentTarget.checked
    local.onChange?.(event)
    local.onCheckedChange?.(next)
    if (local.checked !== undefined) event.currentTarget.checked = !!local.checked
  }

  return (
    <div class={cm.formFieldWrapper}>
      <label class={cm.controlLabel}>
        <input
          ref={(el) => {
            inputRef = el
            // The attribute React writes at creation; the JSX binding keeps the property live.
            reflectCheckedAtCreation(el, local.checked)
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
          {...reactDomProps(rest)}
        />
        {/* React's `slot(label)`: a label that renders nothing adds no text. */}
        <PresentWhileNode node={local.label}>
          {(label) => (
            <span class={cm.cn(cm.controlText, local.disabled && cm.controlDisabled)}>
              {label()}
            </span>
          )}
        </PresentWhileNode>
      </label>
      <Show when={local.error}>
        <p id={errorId()} class={cm.cn(cm.formError, cm.sp('mt', 1))}>
          {local.error}
        </p>
      </Show>
    </div>
  )
}, 'Checkbox')
