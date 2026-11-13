import {
  type Component,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  Show,
  splitProps,
} from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Props for {@link FloatingInput}: the input element attributes plus the
 * React-only spellings this binding keeps (`className`, `defaultValue`).
 */
export interface FloatingInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  /** Extra classes appended to the input (React spelling). */
  className?: string
  /** Initial value of the uncontrolled input (React spelling). */
  defaultValue?: string | number | readonly string[]
}

/**
 * Renders an input with a floating label.
 *
 * Shows the placeholder text as a small uppercase label always visible at
 * the top of the input. On focus the label turns primary-colored.
 *
 * Works as both a controlled and an uncontrolled input: when `value` is
 * omitted, the component tracks its own state seeded from `defaultValue`
 * and still forwards every `onChange` event to the caller.
 *
 * The floating text is a real `<label for>` (not a bare `<span>`), so
 * it is the input's programmatic accessible name via label association —
 * previously the accessible name came only from `placeholder` (stripped by
 * some AT/browser combos once the field has a value), and clicking the
 * floating text did nothing because it wasn't associated with anything.
 * `id` falls back to a generated id when the caller doesn't pass one,
 * mirroring Input/Select/Textarea's id-collision fix.
 *
 * @param props - The input attributes.
 * @returns The rendered floating-input JSX.
 */
export const FloatingInput: Component<FloatingInputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'placeholder',
    'className',
    'value',
    'onChange',
    'onFocus',
    'onBlur',
    'defaultValue',
    'id',
    'style',
  ])

  const cm = getClassMap()
  const [internalValue, setInternalValue] = createSignal(String(local.defaultValue ?? ''))
  const isControlled = (): boolean => local.value !== undefined
  const value = (): string => (isControlled() ? (local.value as string) : internalValue())
  const generatedId = createUniqueId()
  const inputId = (): string => local.id || generatedId

  let inputEl: HTMLInputElement | undefined

  // React renders the input's value as an ATTRIBUTE at mount (and on
  // controlled updates); typing never touches the attribute.
  createEffect(() => {
    inputEl?.setAttribute('value', String(value()))
  })

  // React's text-input onChange fires on the `input` event; a controlled
  // input restores the prop value after the event when the caller does not
  // adopt the typed one.
  const handleInput = (event: Event & { target: HTMLInputElement }): void => {
    if (!isControlled()) {
      setInternalValue(event.target.value)
    }
    ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
    if (isControlled()) event.target.value = String(local.value)
  }

  return (
    <span class={cm.floatingInputWrapper}>
      <input
        ref={(el) => {
          inputEl = el
        }}
        {...(rest as JSX.InputHTMLAttributes<HTMLInputElement>)}
        id={inputId()}
        placeholder={local.placeholder}
        class={cm.cn(cm.input(), cm.floatingInput, local.className)}
        style={toStyleProps(local.style)}
        value={value()}
        onInput={handleInput}
        onFocusIn={local.onFocus as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
        onFocusOut={local.onBlur as JSX.EventHandlerUnion<HTMLInputElement, FocusEvent>}
      />
      <Show when={local.placeholder}>
        <label for={inputId()} class={cm.floatingLabel}>
          {local.placeholder}
        </label>
      </Show>
    </span>
  )
}
