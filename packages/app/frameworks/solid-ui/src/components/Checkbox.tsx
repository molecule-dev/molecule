/**
 * Checkbox component.
 *
 * @module
 */

import { type Component, createEffect,type JSX, Show, splitProps } from 'solid-js'

import type { CheckboxProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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

  const cm = getClassMap()
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let checkboxRef: HTMLInputElement | undefined

  const checkboxId = (): string | undefined => local.id || local.name

  createEffect(() => {
    if (checkboxRef) {
      checkboxRef.indeterminate = !!local.indeterminate
    }
  })

  const checkboxClasses = (): string => cm.cn(cm.checkbox({ error: !!local.error }), local.className)

  return (
    <div class={cm.formFieldWrapper}>
      <label class={cm.controlLabel}>
        <input
          ref={checkboxRef}
          type="checkbox"
          id={checkboxId()}
          name={local.name}
          checked={local.checked}
          disabled={local.disabled}
          data-state={local.checked ? 'checked' : 'unchecked'}
          aria-invalid={!!local.error}
          class={checkboxClasses()}
          style={local.style}
          data-testid={local.testId}
          onChange={local.onChange as JSX.EventHandlerUnion<HTMLInputElement, Event>}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
        <Show when={!!local.label}>
          <span class={cm.cn(cm.controlText, local.disabled && cm.controlDisabled)}>
            {local.label as JSX.Element}
          </span>
        </Show>
      </label>
      <Show when={local.error}>
        <p class={cm.cn(cm.formError, cm.sp('mt', 1))}>{local.error}</p>
      </Show>
    </div>
  )
}
