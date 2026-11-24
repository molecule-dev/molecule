/**
 * TextField: a text input or text area.
 *
 * @module
 */

import {
  type ChangeEvent,
  createElement,
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'

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
  cols,
  wrap,
  autoGrow,
  style,
  webStyle,
  onChange,
  onValueChange,
  ref,
  ...props
}: TextFieldProps & ElementRefProps): ReactElement {
  const forward = useElementRef<HTMLInputElement | HTMLTextAreaElement>(ref)
  const node = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const setNode = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null): void => {
      node.current = element
      forward?.(element)
    },
    [forward],
  )
  useAutoGrow(
    node,
    as === 'textarea' ? autoGrow?.minRows : undefined,
    autoGrow?.maxRows,
    props.value,
  )
  const handleChange =
    onChange || onValueChange
      ? (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
          onChange?.(event)
          onValueChange?.(event.target.value)
        }
      : undefined
  return createElement(as, {
    ...props,
    ...(as === 'input' ? { type } : { rows, cols, wrap }),
    onChange: handleChange,
    ref: setNode,
    style: webElementStyle(style, webStyle),
  })
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
    const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20
    const minHeight = minRows * lineHeight
    const maxHeight = maxRows ? maxRows * lineHeight : Infinity
    const height = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
    element.style.height = `${height}px`
  }, [node, minRows, maxRows])
  // A field the caller holds changes `value`.
  useEffect(() => {
    resize()
  }, [value, resize])
  // A field that stops growing gets the height its classes give it back.
  useEffect(() => {
    const element = node.current
    if (minRows === undefined || !element) return
    return () => {
      element.style.height = ''
    }
  }, [node, minRows])
  // A field the caller does not hold never changes `value`: its own `input` events (typing,
  // paste, IME composition) say it changed.
  useEffect(() => {
    const element = node.current
    if (minRows === undefined || !element) return
    element.addEventListener('input', resize)
    return () => element.removeEventListener('input', resize)
  }, [node, minRows, resize])
}
