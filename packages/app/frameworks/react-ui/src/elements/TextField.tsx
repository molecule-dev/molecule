/**
 * TextField: a text input or text area.
 *
 * @module
 */

import { type ChangeEvent, createElement, type ReactElement } from 'react'

import type { TextFieldProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementRefProps } from './types.js'

/**
 * A text field: renders exactly an `<input>` or `<textarea>` with the props given. On React
 * Native it is a `TextInput` (multi-line for `textarea`). `onValueChange` receives the new text on
 * both renderers; `onChange` receives the web event.
 *
 * @param props - See {@link TextFieldProps}.
 * @returns The element.
 */
export function TextField({
  as,
  type,
  rows,
  style,
  webStyle,
  onChange,
  onValueChange,
  ref,
  ...props
}: TextFieldProps & ElementRefProps): ReactElement {
  const handleChange =
    onChange || onValueChange
      ? (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
          onChange?.(event)
          onValueChange?.(event.target.value)
        }
      : undefined
  return createElement(as, {
    ...props,
    ...(as === 'input' ? { type } : { rows }),
    onChange: handleChange,
    ref: useElementRef(ref),
    style: webElementStyle(style, webStyle),
  })
}
