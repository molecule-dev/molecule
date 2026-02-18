/**
 * RadioGroup component.
 *
 * @module
 */

import { type Component, For, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { RadioGroupProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the RadioGroup component.
 * @param props - The component props.
 * @returns The rendered radio group JSX.
 */
export const RadioGroup: Component<RadioGroupProps<string>> = (props) => {
  const [local] = splitProps(props, [
    'options',
    'value',
    'onChange',
    'size',
    'label',
    'direction',
    'error',
    'className',
    'style',
    'testId',
    'disabled',
  ])

  const cm = getClassMap()
  const direction = (): 'horizontal' | 'vertical' => local.direction || 'vertical'

  const handleChange = (optionValue: string): void => {
    local.onChange?.(optionValue)
  }

  return (
    <div
      class={local.className}
      style={local.style}
      data-testid={local.testId}
      role="radiogroup"
      aria-label={local.label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })}
    >
      <Show when={local.label}>
        <div class={cm.cn(cm.label({}), cm.radioGroupLabel)}>{local.label}</div>
      </Show>
      <div
        class={cm.radioGroupLayout(direction())}
      >
        <For each={local.options}>
          {(option) => {
            const isChecked = (): boolean => local.value === option.value
            const isDisabled = (): boolean | undefined => local.disabled || option.disabled

            return (
              <label
                class={cm.cn(
                  cm.controlLabel,
                  isDisabled() && cm.controlDisabled,
                )}
              >
                <input
                  type="radio"
                  name={local.label}
                  value={option.value}
                  checked={isChecked()}
                  disabled={isDisabled()}
                  onChange={() => handleChange(option.value)}
                  data-state={isChecked() ? 'checked' : 'unchecked'}
                  class={cm.cn(cm.radio({ error: !!local.error }), cm.cursorPointer)}
                />
                <span class={cm.controlText}>{option.label as JSX.Element}</span>
              </label>
            )
          }}
        </For>
      </div>
      <Show when={local.error}>
        <p class={cm.cn(cm.formError, cm.sp('mt', 1))}>{local.error}</p>
      </Show>
    </div>
  )
}
