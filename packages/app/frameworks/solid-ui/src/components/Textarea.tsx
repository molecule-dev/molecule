/**
 * Textarea component.
 *
 * @module
 */

import { type Component, createEffect,type JSX, Show, splitProps } from 'solid-js'

import type { TextareaProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the Textarea component.
 * @param props - The component props.
 * @returns The rendered textarea JSX.
 */
export const Textarea: Component<TextareaProps> = (props) => {
  const [local, rest] = splitProps(props, [
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

  const cm = getClassMap()
  // eslint-disable-next-line no-unassigned-vars -- assigned via SolidJS ref binding
  let textareaRef: HTMLTextAreaElement | undefined

  const textareaId = (): string | undefined => local.id || local.name
  const minRows = (): number => local.minRows ?? 3

  const autoResizeTextarea = (): void => {
    if (local.autoResize && textareaRef) {
      textareaRef.style.height = 'auto'
      const lineHeight = parseInt(getComputedStyle(textareaRef).lineHeight) || 20
      const minHeight = minRows() * lineHeight
      const maxHeight = local.maxRows ? local.maxRows * lineHeight : Infinity
      const newHeight = Math.min(Math.max(textareaRef.scrollHeight, minHeight), maxHeight)
      textareaRef.style.height = `${newHeight}px`
    }
  }

  createEffect(() => {
    // Track value to trigger auto-resize
    void local.value
    autoResizeTextarea()
  })

  const textareaClasses = (): string => cm.cn(cm.textarea({ error: !!local.error }), local.className)

  return (
    <div class={cm.inputWrapper}>
      <Show when={local.label}>
        <label
          for={textareaId()}
          class={cm.cn(cm.label({ required: local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <textarea
        ref={textareaRef}
        id={textareaId()}
        name={local.name}
        value={(local.value as string) ?? ''}
        placeholder={local.placeholder}
        disabled={local.disabled}
        required={local.required}
        rows={local.rows || minRows()}
        aria-invalid={!!local.error}
        aria-describedby={
          local.error
            ? `${textareaId()}-error`
            : local.hint
              ? `${textareaId()}-hint`
              : undefined
        }
        class={textareaClasses()}
        style={local.style}
        data-testid={local.testId}
        onChange={local.onChange as JSX.EventHandlerUnion<HTMLTextAreaElement, Event>}
        onFocus={local.onFocus as JSX.EventHandlerUnion<HTMLTextAreaElement, FocusEvent>}
        onBlur={local.onBlur as JSX.EventHandlerUnion<HTMLTextAreaElement, FocusEvent>}
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
