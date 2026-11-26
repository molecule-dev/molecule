/**
 * Input component.
 *
 * @module
 */

import { createUniqueId, Show, splitProps } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import type { MouseEventHandler } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import type { InputProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Input component.
 * @param props - The component props.
 * @returns The rendered input JSX.
 */
export const Input = withDisplayName<WithRef<InputProps, HTMLInputElement>>((props) => {
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
    'onValueChange',
    'onFocus',
    'onBlur',
  ])

  const cm = getClassMap()
  // A column around the label, the control's row and the message, so the control's margin
  // moves the control on every renderer (the same layout in every framework's kit).
  const field = fieldLayout(cm)
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
    local.onChange?.(event)
    local.onValueChange?.(event.target.value)
    if (local.value !== undefined) event.target.value = String(local.value)
  }

  const inputClasses = (hasLeft: boolean, hasRight: boolean): string =>
    cm.cn(
      cm.input({
        error: !!local.error,
        size: local.size ?? 'md',
        align: local.align,
      }),
      hasLeft && cm.inputPadLeft,
      (hasRight || local.clearable) && cm.inputPadRight,
      local.className,
    )

  // The clear button takes the right element's place while there is a value to clear.
  const clearing = (): boolean => !!(local.clearable && local.value)

  return (
    <div class={field.root}>
      <Show when={local.label}>
        <label
          for={inputId()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <div class={field.inner}>
        {/* React's `slot(...)`: a side element that renders nothing adds no wrapper and no
            padding. Each is read where it renders, so it is created and disposed as React mounts it. */}
        <ResolveNode node={local.leftElement}>
          {(left, hasLeft) => (
            <ResolveNode node={clearing() ? undefined : local.rightElement}>
              {(right, hasRight) => (
                <>
                  <Show when={hasLeft()}>
                    <div class={cm.inputLeftElement}>{left()}</div>
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
                      local.error
                        ? `${inputId()}-error`
                        : local.hint
                          ? `${inputId()}-hint`
                          : undefined
                    }
                    class={inputClasses(hasLeft(), hasRight())}
                    style={toStyleProps(local.style)}
                    data-testid={local.testId}
                    onInput={handleInput}
                    onFocusIn={local.onFocus}
                    onFocusOut={local.onBlur}
                    {...reactDomProps(rest)}
                  />
                  <Show when={hasRight() || clearing()}>
                    <div class={cm.inputRightElement}>
                      <Show
                        when={clearing()}
                        fallback={<span class={cm.textMuted}>{right()}</span>}
                      >
                        <button
                          type="button"
                          disabled={local.disabled}
                          onClick={(event) => {
                            const onClearClick: MouseEventHandler | undefined = local.onClear
                            onClearClick?.(event)
                            local.onValueChange?.('')
                          }}
                          class={cm.inputClearButton}
                          aria-label={
                            local.clearLabel ??
                            t('ui.input.clear', undefined, { defaultValue: 'Clear' })
                          }
                        >
                          {renderIcon('x-mark', cm.iconSm)}
                        </button>
                      </Show>
                    </div>
                  </Show>
                </>
              )}
            </ResolveNode>
          )}
        </ResolveNode>
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
}, 'Input')
