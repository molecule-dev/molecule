/**
 * TextField: a text input or text area.
 *
 * @module
 */

import {
  type ChangeEvent,
  createElement,
  type FocusEvent,
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import type { TextFieldProps } from '@molecule/app-ui'

import { pasteHandler } from './paste.js'
import { useElementRef } from './ref.js'
import { webElementAttributes, webElementStyle } from './style.js'
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
  autoGrow,
  selectTextOnFocus,
  ref,
  ...props
}: TextFieldProps & ElementRefProps): ReactElement {
  const { type, style, webStyle, onChange, onValueChange, onFocus, onPasteText } = props
  // The raw DOM handle provides select() and preserves the field's identity for measurement.
  const forward = useElementRef<HTMLInputElement | HTMLTextAreaElement>(ref)
  const node = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const setNode = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null): void => {
      node.current = element
      forward?.(element)
    },
    [forward],
  )
  const grow = as === 'textarea' ? autoGrow : undefined
  const bounded = as === 'input' && (type === 'number' || type === 'date')
  useAutoGrow(node, grow?.minRows, grow?.maxRows, props.value)
  const handleChange =
    onChange || onValueChange
      ? (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
          onChange?.(event)
          onValueChange?.(event.target.value)
        }
      : undefined
  return createElement(
    as,
    webElementAttributes(
      props,
      {
        ...(bounded ? {} : { min: undefined, max: undefined, step: undefined }),
        ...(as === 'input'
          ? { rows: undefined, cols: undefined, wrap: undefined }
          : { type: undefined }),
        onChange: handleChange,
        onFocus: selectTextOnFocus
          ? (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
              event.currentTarget.select()
              onFocus?.(event)
            }
          : onFocus,
        onPaste: pasteHandler(onPasteText),
        ref: setNode,
        ...(grow && {
          style: {
            ...webElementStyle(style, webStyle),
            minHeight: `${Math.min(grow.minRows, grow.maxRows ?? Infinity)}lh`,
            ...(grow.maxRows === undefined ? {} : { maxHeight: `${grow.maxRows}lh` }),
          },
        }),
      },
      { onPasteText: 'onPaste', onValueChange: 'onChange' },
    ),
  )
}

/**
 * Sizes a text area to its text between line counts: on each change of `value` (a field the
 * caller holds) and on each `input` event (one it does not), the height becomes the text's
 * height, at least `minRows` and at most `maxRows` lines.
 *
 * @param node - The text area.
 * @param minRows - The fewest lines, or `undefined` for a field that does not grow.
 * @param maxRows - The most lines, or `undefined` for no limit.
 * @param value - The text the caller holds, if any.
 */
function useAutoGrow(
  node: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  minRows: number | undefined,
  maxRows: number | undefined,
  value: string | undefined,
): void {
  const resize = useCallback(() => {
    const element = node.current
    if (minRows === undefined || !element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [node, minRows])
  // Remeasure on controlled value or row changes after React applies the bounds.
  useEffect(() => {
    resize()
  }, [value, maxRows, resize])
  // A field the caller does not hold never changes `value`: its own `input` events (typing,
  // paste, IME composition) say it changed.
  useEffect(() => {
    const element = node.current
    if (minRows === undefined || !element) return
    element.addEventListener('input', resize)
    return () => {
      element.removeEventListener('input', resize)
      element.style.height = ''
    }
  }, [node, minRows, maxRows, resize])
}
