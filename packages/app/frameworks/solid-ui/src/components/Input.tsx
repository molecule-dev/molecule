/**
 * Input component.
 *
 * @module
 */

import { type Component, createUniqueId, type JSX, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { InputProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { renderIcon } from '../utilities/renderIcon.jsx'

/**
 * Renders the Input component.
 * @param props - The component props.
 * @returns The rendered input JSX.
 */
export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'type',
    'size',
    'align',
    'label',
    'error',
    'hint',
    'leftElement',
    'rightElement',
    'clearable',
    'onClear',
    'clearLabel',
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
    'onChange',
    'onFocus',
    'onBlur',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  // Fall back to a generated id so label htmlFor / aria-describedby never
  // point at `undefined-error` (which also collides across multiple
  // id-less inputs on the same page).
  const generatedId = createUniqueId()
  const inputId = (): string => local.id || local.name || generatedId

  // React's text-input onChange fires on the `input` event, and a
  // controlled input restores the prop value after each event when the
  // caller does not adopt the typed one.
  const handleInput = (event: Event & { target: HTMLInputElement }): void => {
    ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
    if (local.value !== undefined) event.target.value = String(local.value)
  }

  const inputClasses = (): string =>
    cm.cn(
      cm.input({
        error: !!local.error,
        size: local.size ?? 'md',
        align: local.align,
      }),
      !!local.leftElement && cm.inputPadLeft,
      !!(local.rightElement || local.clearable) && cm.inputPadRight,
      local.className,
    )

  return (
    <div class={cm.inputWrapper}>
      <Show when={local.label}>
        <label
          for={inputId()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <div class={cm.inputInner}>
        <Show when={local.leftElement}>
          <div class={cm.inputLeftElement}>{local.leftElement as JSX.Element}</div>
        </Show>
        <input
          type={local.type ?? 'text'}
          id={inputId()}
          name={local.name}
          attr:value={local.value ?? local.defaultValue}
          placeholder={local.placeholder}
          disabled={local.disabled}
          required={local.required}
          aria-invalid={!!local.error}
          aria-describedby={
            local.error ? `${inputId()}-error` : local.hint ? `${inputId()}-hint` : undefined
          }
          class={inputClasses()}
          style={toStyleProps(local.style)}
          data-testid={local.testId}
          onInput={handleInput}
          onFocusIn={local.onFocus as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
          onFocusOut={local.onBlur as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
        <Show when={local.rightElement || (local.clearable && local.value)}>
          <div class={cm.inputRightElement}>
            <Show
              when={local.clearable && local.value}
              fallback={<span class={cm.textMuted}>{local.rightElement as JSX.Element}</span>}
            >
              <button
                type="button"
                onClick={local.onClear as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>}
                class={cm.inputClearButton}
                aria-label={
                  local.clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })
                }
              >
                {renderIcon('x-mark', cm.iconSm)}
              </button>
            </Show>
          </div>
        </Show>
      </div>
      <Show when={local.error}>
        <p id={`${inputId()}-error`} class={cm.formError}>
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={`${inputId()}-hint`} class={cm.formHint}>
          {local.hint}
        </p>
      </Show>
    </div>
  )
}
