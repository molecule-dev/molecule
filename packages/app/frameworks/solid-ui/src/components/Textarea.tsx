/**
 * Textarea component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import type { TextareaProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the Textarea component.
 * @param props - The component props.
 * @returns The rendered textarea JSX.
 */
export const Textarea: Component<TextareaProps> = (props) => {
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
    'onFocus',
    'onBlur',
  ])

  let textareaRef: HTMLTextAreaElement | undefined

  const cm = getClassMap()
  // Fall back to a generated id so label htmlFor / aria-describedby never
  // point at `undefined-error` (which also collides across multiple
  // id-less textareas on the same page).
  const generatedId = createUniqueId()
  const textareaId = (): string => local.id || local.name || generatedId

  // React's text-input onChange fires on the `input` event; a controlled
  // textarea restores the prop value after the event when the caller does
  // not adopt the typed one.
  const handleInput = (event: Event & { target: HTMLTextAreaElement }): void => {
    ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
    if (local.value !== undefined) event.target.value = String(local.value)
  }

  const resize = (): void => {
    const element = textareaRef
    if (!local.autoResize || !element) return
    element.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
    const minHeight = (local.minRows ?? 3) * lineHeight
    const maxHeight = local.maxRows ? local.maxRows * lineHeight : Infinity
    const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
    element.style.height = `${newHeight}px`
  }

  // Controlled usage (value tracked by the caller) recomputes here.
  createEffect(() => {
    void local.value
    resize()
  })

  // Uncontrolled usage (defaultValue + the user typing) never changes
  // `value`, so the effect above never re-runs — autoResize silently did
  // nothing for every uncontrolled textarea. Listening for real `input`
  // events on the element itself catches keystrokes, paste, and IME
  // composition regardless of whether the caller tracks `value`.
  createEffect(() => {
    const element = textareaRef
    if (!local.autoResize || !element) return
    element.addEventListener('input', resize)
    onCleanup(() => element.removeEventListener('input', resize))
  })

  const textareaClasses = (): string =>
    cm.cn(cm.textarea({ error: !!local.error, size: local.size }), local.className)

  return (
    <div class={cm.inputWrapper}>
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
        // autoResize sizes the box to its content via inline height, but the
        // bond's min-h class would floor it — neutralize it and let resize()
        // enforce `minRows` instead. Caller style still wins.
        style={toStyleProps(
          local.autoResize ? { minHeight: 0, resize: 'none', ...local.style } : local.style,
        )}
        data-testid={local.testId}
        onInput={handleInput}
        onFocusIn={local.onFocus as JSX.EventHandlerUnion<HTMLTextAreaElement, FocusEvent>}
        onFocusOut={local.onBlur as JSX.EventHandlerUnion<HTMLTextAreaElement, FocusEvent>}
        {...(rest as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
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
}
