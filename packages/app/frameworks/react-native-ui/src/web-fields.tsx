/**
 * DOM controls registered with the native kit's form and fieldset scopes on React Native Web.
 *
 * @module
 */

import { type ReactNode, type Ref, useContext, useMemo, useRef } from 'react'

import type { KitCheckFieldProps, SwitchButtonProps } from '@molecule/app-react-ui-kit-components'
import { SwitchButton } from '@molecule/app-react-ui-kit-components/dom'
import { CheckField as DomCheckField } from '@molecule/app-react-ui-kit-components/elements/CheckField.js'
import { SelectField as DomSelectField } from '@molecule/app-react-ui-kit-components/elements/SelectField.js'
import { TextField as DomTextField } from '@molecule/app-react-ui-kit-components/elements/TextField.js'
import { mergeRefs } from '@molecule/app-react-ui-kit-components/helpers'
import type {
  CheckFieldHandle,
  ElementHandle,
  FormEntries,
  SelectFieldProps,
  TextFieldProps,
} from '@molecule/app-ui'

import { DisabledScope, type FormField, FormScope, useFormRegistration } from './elements/form.js'

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/** Reads each mounted control through its DOM properties, including changes during a callback. */
function useRegisteredField<T extends Field>(
  ref: Ref<ElementHandle> | undefined,
  read: (element: T) => Omit<FormField, 'valid'>,
): Ref<T> {
  const form = useContext(FormScope)
  const element = useRef<T>(null)
  const registeredRef = useMemo(() => mergeRefs<ElementHandle>(ref, element), [ref])
  useFormRegistration(form?.fields, {
    entries: () => (element.current ? read(element.current).entries() : []),
    valid: () => element.current?.validity.valid ?? true,
    reset: () => {
      if (element.current) read(element.current).reset()
    },
    focus: () => {
      if (element.current) read(element.current).focus()
    },
    checkedRadio: () => (element.current ? read(element.current).checkedRadio?.() : undefined),
  })
  return registeredRef
}

/** A checkbox or radio that participates in the surrounding native form when there is one. */
export function CheckField({
  ref,
  formFocus,
  ...props
}: KitCheckFieldProps & { ref?: Ref<CheckFieldHandle> }): ReactNode {
  const disabled = useContext(DisabledScope) || props.disabled
  const input = useRegisteredField<HTMLInputElement>(ref, (element) => ({
    entries: () =>
      element.name && !element.disabled && element.checked ? [[element.name, element.value]] : [],
    reset: () => {
      if (props.checked === undefined) {
        element.checked = element.defaultChecked
        element.indeterminate = props.indeterminate ?? false
      }
    },
    focus: formFocus ?? (() => element.focus()),
    checkedRadio: () =>
      element.type === 'radio' && !element.disabled && element.checked ? element.name : undefined,
  }))
  return <DomCheckField {...props} ref={input} disabled={disabled} />
}

/** The DOM switch button inherits the fieldset's disabled state alongside its hidden input. */
export function WebSwitchButton(
  props: SwitchButtonProps & { ref?: Ref<ElementHandle> },
): ReactNode {
  const disabled = useContext(DisabledScope) || props.disabled
  return <SwitchButton {...props} disabled={disabled} />
}

/** A textarea registered alongside the native controls in its form. */
export function TextField({
  ref,
  ...props
}: TextFieldProps & { ref?: Ref<ElementHandle> }): ReactNode {
  const disabled = useContext(DisabledScope) || props.disabled
  const text = useRegisteredField<HTMLTextAreaElement>(ref, (element) => ({
    entries: () => (element.name && !element.disabled ? [[element.name, element.value]] : []),
    reset: () => {
      if (props.value === undefined) element.value = element.defaultValue
    },
    focus: () => element.focus(),
  }))
  return <DomTextField {...props} ref={text} disabled={disabled} />
}

/** A select registered alongside the native controls in its form. */
export function SelectField({
  ref,
  ...props
}: SelectFieldProps & { ref?: Ref<ElementHandle> }): ReactNode {
  const disabled = useContext(DisabledScope) || props.disabled
  const select = useRegisteredField<HTMLSelectElement>(ref, (element) => ({
    entries: (): FormEntries =>
      element.name && !element.disabled
        ? Array.from(element.selectedOptions)
            .filter((option) => !option.disabled && !option.closest('optgroup[disabled]'))
            .map((option) => [element.name, option.value])
        : [],
    reset: () => {
      if (props.value !== undefined) return
      let firstEnabled = -1
      for (const option of element.options) {
        option.selected = option.defaultSelected
        if (firstEnabled < 0 && !option.disabled && !option.closest('optgroup[disabled]')) {
          firstEnabled = option.index
        }
      }
      if (!element.multiple && element.selectedIndex === -1) element.selectedIndex = firstEnabled
    },
    focus: () => element.focus(),
  }))
  return <DomSelectField {...props} ref={select} disabled={disabled} />
}
