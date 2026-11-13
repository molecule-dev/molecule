/**
 * RadioGroup component.
 *
 * @module
 */

import { type Component, createUniqueId, For, type JSX, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { RadioGroupProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'

/**
 * Renders the RadioGroup component.
 *
 * Radios only form a native group (arrow-key navigation, exclusive native
 * checked state) when they share a `name` — and that name must be UNIQUE per
 * group. The old `label`-as-name fallback merged every group sharing a
 * visible label (e.g. two "Size" pickers) into ONE native group: selecting
 * in one silently deselected the other. Callers that need a specific
 * submitted field name pass the `name` prop.
 *
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
    'name',
    'direction',
    'error',
    'className',
    'style',
    'testId',
    'disabled',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const generatedName = createUniqueId()
  const groupName = (): string => local.name || generatedName
  const errorId = (): string => `${groupName()}-error`

  // React reconciles the radios by `key={option.value}`: an option's `<label>`
  // node survives an options update whose key is unchanged and moves on a
  // reorder. `<For>` keys by object identity, so the render iterates the KEYS
  // and reads each option through the lookup.
  const options = createKeyedList(
    () => local.options,
    (option) => option.value,
  )

  let groupRef: HTMLDivElement | undefined

  // A controlled group restores every radio's checked state after an event
  // when the caller does not adopt the picked one (React re-renders the
  // controlled `checked` after the change — a group without a `value` prop is
  // still controlled: every radio restores to unchecked).
  const restoreControlled = (): void => {
    if (!groupRef) return
    for (const radio of Array.from(groupRef.querySelectorAll('input[type="radio"]'))) {
      const input = radio as HTMLInputElement
      input.checked = input.value === local.value
    }
  }

  return (
    <div
      ref={(el) => {
        groupRef = el
      }}
      class={local.className}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      role="radiogroup"
      aria-label={
        local.label ?? t('ui.radioGroup.label', undefined, { defaultValue: 'Radio group' })
      }
      aria-invalid={local.error ? true : undefined}
      aria-describedby={local.error ? errorId() : undefined}
    >
      <Show when={local.label}>
        <div class={cm.cn(cm.label({ required: false }), cm.sp('mb', 2))}>{local.label}</div>
      </Show>
      <div class={cm.radioGroupLayout(local.direction ?? 'vertical')}>
        <For each={options.keys()}>
          {(key) => {
            const option = (): RadioGroupProps<string>['options'][number] => options.get(key)!
            const isChecked = (): boolean => local.value === option().value
            const isDisabled = (): boolean => !!(local.disabled || option().disabled)

            return (
              <label class={cm.cn(cm.controlLabel, isDisabled() && cm.controlDisabled)}>
                <input
                  ref={(el) => {
                    // React renders the initially selected radio with the
                    // boolean `checked` attribute; the JSX binding keeps the
                    // live property in step.
                    if (isChecked()) el.setAttribute('checked', '')
                  }}
                  type="radio"
                  name={groupName()}
                  value={option().value}
                  checked={isChecked()}
                  disabled={isDisabled()}
                  data-state={isChecked() ? 'checked' : 'unchecked'}
                  class={cm.cn(cm.radio({ error: !!local.error }), cm.cursorPointer)}
                  onChange={() => {
                    local.onChange?.(option().value)
                    restoreControlled()
                  }}
                />
                <span class={cm.controlText}>{option().label as JSX.Element}</span>
              </label>
            )
          }}
        </For>
      </div>
      <Show when={local.error}>
        <p id={errorId()} class={cm.cn(cm.formError, cm.sp('mt', 1))}>
          {local.error}
        </p>
      </Show>
    </div>
  )
}
