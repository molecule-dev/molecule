/**
 * Keeps the native kit's eventless field callbacks on both renderers.
 *
 * @module
 */

import { type FC, forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import type { TextInput } from 'react-native'

import { useTranslation } from '@molecule/app-react'
import type { createKit } from '@molecule/app-react-ui-kit-components'
import type { AlertProps } from '@molecule/app-ui'

import type { CheckboxProps, SelectProps, SwitchProps, TextareaProps } from '../types.js'

/**
 * Adapts components to the native kit's eventless public props.
 * @param kit - The shared kit bound to the current renderer's hosts.
 * @param device - Whether the picker starts with the native placeholder.
 * @returns The native kit's eventless components.
 */
export function bindNativeCallbacks(
  kit: ReturnType<typeof createKit>,
  device = false,
): {
  Alert: FC<AlertProps & { live?: boolean }>
  Checkbox: FC<CheckboxProps>
  Switch: FC<SwitchProps>
  Select: FC<SelectProps>
  Textarea: ForwardRefExoticComponent<TextareaProps & RefAttributes<TextInput>>
} {
  const Alert: FC<AlertProps & { live?: boolean }> = ({ onDismiss, ...props }) => (
    <kit.Alert {...props} onDismiss={onDismiss ? () => onDismiss() : undefined} />
  )

  const Checkbox: FC<CheckboxProps> = ({
    onChange: _onChange,
    onClick: _onClick,
    onFocus: _onFocus,
    onBlur: _onBlur,
    ...props
  }) => <kit.Checkbox {...props} />

  const Switch: FC<SwitchProps> = ({
    onChange: _onChange,
    onClick: _onClick,
    onFocus: _onFocus,
    onBlur: _onBlur,
    ...props
  }) => <kit.Switch {...props} />

  const Select: FC<SelectProps> = ({
    onChange: _onChange,
    onClick: _onClick,
    placeholder,
    ...props
  }) => {
    const { t } = useTranslation()
    const usePlaceholder = device && !props.clearable && !props.multiple
    return (
      <kit.Select
        {...props}
        placeholder={
          placeholder ??
          (usePlaceholder
            ? t('ui.select.placeholder', undefined, { defaultValue: 'Select…' })
            : undefined)
        }
        defaultValue={usePlaceholder || (device && placeholder) ? '' : undefined}
      />
    )
  }

  const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
    { onChange: _onChange, onInput: _onInput, onFocus, onBlur, ...props },
    ref,
  ) {
    return (
      <kit.Textarea
        {...props}
        ref={ref}
        onFocus={onFocus ? () => onFocus() : undefined}
        onBlur={onBlur ? () => onBlur() : undefined}
      />
    )
  })
  return { Alert, Checkbox, Switch, Select, Textarea }
}
