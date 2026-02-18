/**
 * Input component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { InputProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Renders the Input component.
 * @param props - The component props.
 * @returns The rendered input JSX.
 */
export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'type',
    'size',
    'label',
    'error',
    'hint',
    'leftElement',
    'rightElement',
    'clearable',
    'clearLabel',
    'onClear',
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
  const inputId = (): string | undefined => local.id || local.name

  const inputClasses = (): string =>
    cm.cn(
      cm.input({ error: !!local.error, size: local.size }),
      !!local.leftElement && cm.inputPadLeft,
      !!(local.rightElement || local.clearable) && cm.inputPadRight,
      local.className,
    )

  return (
    <div class={cm.inputWrapper}>
      <Show when={local.label}>
        <label
          for={inputId()}
          class={cm.cn(cm.label({ required: local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <div class={cm.inputInner}>
        <Show when={!!local.leftElement}>
          <div class={cm.inputLeftElement}>
            {local.leftElement as JSX.Element}
          </div>
        </Show>
        <input
          type={local.type || 'text'}
          id={inputId()}
          name={local.name}
          value={(local.value as string) ?? ''}
          placeholder={local.placeholder}
          disabled={local.disabled}
          required={local.required}
          aria-invalid={!!local.error}
          aria-describedby={
            local.error
              ? `${inputId()}-error`
              : local.hint
                ? `${inputId()}-hint`
                : undefined
          }
          class={inputClasses()}
          style={local.style}
          data-testid={local.testId}
          onChange={local.onChange as JSX.EventHandlerUnion<HTMLInputElement, Event>}
          onFocus={local.onFocus as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
          onBlur={local.onBlur as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
          {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        />
        <Show when={local.rightElement || (local.clearable && local.value)}>
          <div class={cm.inputRightElement}>
            <Show
              when={local.clearable && local.value}
              fallback={
                <span class={cm.textMuted}>
                  {local.rightElement as JSX.Element}
                </span>
              }
            >
              <button
                type="button"
                onClick={local.onClear}
                class={cm.inputClearButton}
                aria-label={local.clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })}
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
