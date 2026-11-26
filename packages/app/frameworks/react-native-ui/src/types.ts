/** Prop types for controls that deliver renderer-neutral callbacks on React Native. */
import type * as UI from '@molecule/app-ui'

type WebHandler = Extract<keyof UI.HTMLElementProps, `on${string}`> | 'onChange' | 'onInput'

/** Exposes the supported notifications and rejects web handlers even in spread props. */
type NativeControlProps<Props, Notification extends WebHandler = never> = Omit<
  Props,
  WebHandler
> & {
  [Name in Extract<keyof Props, WebHandler>]?: Name extends Notification ? () => void : never
}

/** Native button props. `onClick` signals activation. */
export type ButtonProps = NativeControlProps<UI.ButtonProps, 'onClick'>

/** Native card props. `onClick` signals activation. */
export type CardProps = NativeControlProps<UI.CardProps, 'onClick'>

/** Native checkbox props. Use `onCheckedChange` to receive the new checked state. */
export type CheckboxProps = NativeControlProps<UI.CheckboxProps>

/** Native layout props. `onClick` signals touch release. */
export type FlexProps = NativeControlProps<UI.FlexProps, 'onClick'>

/** Native input props. `onValueChange` receives the text, including an empty string on clear. */
export type InputProps = NativeControlProps<UI.InputProps, 'onFocus' | 'onBlur'>

/** Native picker props. Use `onValueChange` to receive the selected value. */
export type SelectProps<T = string> = NativeControlProps<UI.SelectProps<T>>

/** Native switch props. Use `onCheckedChange` to receive the new checked state. */
export type SwitchProps = NativeControlProps<UI.SwitchProps>

/** Native textarea props. Use `onValueChange` to receive the new text. */
export type TextareaProps = NativeControlProps<UI.TextareaProps, 'onFocus' | 'onBlur'>
