/**
 * Textarea component.
 *
 * @module
 */

import { createEffect, createUniqueId, onCleanup, Show, splitProps } from 'solid-js'

import type { TextareaProps } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Textarea component.
 * @param props - The component props.
 * @returns The rendered textarea JSX.
 */
export const Textarea = withDisplayName<WithRef<TextareaProps, HTMLTextAreaElement>>((props) => {
  const [local, rest] = splitProps(props, [
    'size',
    'label',
    'error',
    'hint',
    'autoResize',
    'minRows',
    'maxRows',
    'className',
    'style',
    'testId',
    'disabled',
    'required',
    'value',
    'defaultValue',
    'placeholder',
    'name',
    'id',
    'rows',
    'onChange',
    'onValueChange',
    'onFocus',
    'onBlur',
  ])

  let textareaRef: HTMLTextAreaElement | undefined

  const cm = getClassMap()
  // A column around the label, the control and the message, so the control's margin moves
  // the control on every renderer (the same layout in every framework's kit).
  const field = fieldLayout(cm)
  // Fall back to a generated id so label htmlFor / aria-describedby never
  // point at `undefined-error` (which also collides across multiple
  // id-less textareas on the same page).
  const generatedId = createUniqueId()
  const textareaId = (): string => local.id || local.name || generatedId

  // React's text-input onChange fires on the `input` event; a controlled
  // textarea restores the prop value after the event when the caller does
  // not adopt the typed one.
  const handleInput = (event: Event & { target: HTMLTextAreaElement }): void => {
    local.onChange?.(event)
    local.onValueChange?.(event.target.value)
    if (local.value !== undefined) event.target.value = String(local.value)
  }

  const resize = (): void => {
    const element = textareaRef
    if (!local.autoResize || !element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }

  // Uncontrolled input events resize the field. Clear the previous measurement
  // when the bounds change or growing stops.
  createEffect(() => {
    void local.minRows
    void local.maxRows
    const element = textareaRef
    if (!local.autoResize || !element) return
    element.addEventListener('input', resize)
    onCleanup(() => {
      element.removeEventListener('input', resize)
      element.style.height = ''
    })
  })

  // Measure after the old height is cleared and the new rows and bounds are applied.
  createEffect(() => {
    void local.value
    void local.minRows
    void local.maxRows
    resize()
  })

  const textareaClasses = (): string =>
    cm.cn(cm.textarea({ error: !!local.error, size: local.size }), local.className)

  return (
    <div class={field.root}>
      <Show when={local.label}>
        <label
          for={textareaId()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <textarea
        ref={(el) => {
          textareaRef = el
        }}
        id={textareaId()}
        name={local.name}
        value={(local.value ?? local.defaultValue) as string | undefined}
        placeholder={local.placeholder}
        disabled={local.disabled}
        required={local.required}
        rows={local.rows || (local.minRows ?? 3)}
        aria-invalid={!!local.error}
        aria-describedby={
          local.error ? `${textareaId()}-error` : local.hint ? `${textareaId()}-hint` : undefined
        }
        class={textareaClasses()}
        style={toStyleProps(
          local.autoResize
            ? {
                resize: 'none',
                ...local.style,
                minHeight: `${Math.min(local.minRows ?? 3, local.maxRows ?? Infinity)}lh`,
                ...(local.maxRows === undefined ? {} : { maxHeight: `${local.maxRows}lh` }),
              }
            : local.style,
        )}
        data-testid={local.testId}
        onInput={handleInput}
        onFocusIn={local.onFocus}
        onFocusOut={local.onBlur}
        {...reactDomProps(rest)}
      />
      <Show when={local.error}>
        <p id={`${textareaId()}-error`} class={cm.formError}>
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={`${textareaId()}-hint`} class={cm.formHint}>
          {local.hint}
        </p>
      </Show>
    </div>
  )
}, 'Textarea')
