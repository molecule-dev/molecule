/**
 * Form components.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { FormFieldProps, FormProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Form component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Form: Component<FormProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'onFormSubmit',
    'submitting',
    'className',
    'style',
    'testId',
    'onSubmit',
    'action',
    'method',
    'noValidate',
  ])

  const cm = getClassMap()

  const handleSubmit: JSX.EventHandlerUnion<HTMLFormElement, Event> = (e) => {
    if (local.onFormSubmit) {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const data: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      local.onFormSubmit(data)
    }
    local.onSubmit?.(e as unknown as Event)
  }

  return (
    <form
      class={local.className}
      style={local.style}
      data-testid={local.testId}
      action={local.action}
      method={local.method}
      noValidate={local.noValidate}
      onSubmit={handleSubmit}
      {...(rest as JSX.FormHTMLAttributes<HTMLFormElement>)}
    >
      <fieldset disabled={local.submitting} class={cm.formFieldsetContents}>
        {local.children as JSX.Element}
      </fieldset>
    </form>
  )
}

/**
 * Form field wrapper component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const FormField: Component<FormFieldProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'label',
    'name',
    'error',
    'hint',
    'required',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()

  return (
    <div
      class={cm.cn(cm.formField, local.className)}
      style={local.style}
      data-testid={local.testId}
    >
      <Show when={local.label}>
        <label
          for={local.name}
          class={cm.cn(cm.label({ required: local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      {local.children as JSX.Element}
      <Show when={local.error}>
        <p id={`${local.name}-error`} class={cm.formError}>
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={`${local.name}-hint`} class={cm.formHint}>
          {local.hint}
        </p>
      </Show>
    </div>
  )
}

/**
 * Label component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Label: Component<{
  children?: JSX.Element
  required?: boolean
  class?: string
  for?: string
}> = (props) => {
  const cm = getClassMap()
  return (
    <label for={props.for} class={cm.cn(cm.label({ required: props.required }), props.class)}>
      {props.children}
    </label>
  )
}
