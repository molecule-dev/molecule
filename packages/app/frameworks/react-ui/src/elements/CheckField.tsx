/**
 * CheckField: a checkbox or controlled radio.
 *
 * @module
 */

import {
  type ChangeEvent,
  createElement,
  type ReactElement,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'

import type { CheckFieldHandle, CheckFieldProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'

/**
 * Renders the original input tag and forwards the browser's check state and events.
 *
 * @param props - The checkbox or radio's props and ref.
 * @returns The input.
 */
export function CheckField({
  as,
  indeterminate,
  nativeChangeEvent,
  ref,
  ...props
}: CheckFieldProps & { ref?: Ref<CheckFieldHandle> }): ReactElement {
  const { checked, onChange, onCheckedChange } = props
  const node = useRef<HTMLInputElement | null>(null)
  const forward = useElementRef<HTMLInputElement>(ref)
  const handleNativeChange = useCallback(
    (event: Event): void => {
      const input = node.current
      if (!input) return
      const next = input.checked
      onChange?.(event)
      onCheckedChange?.(next)
    },
    [onChange, onCheckedChange],
  )
  const listener = nativeChangeEvent ? handleNativeChange : undefined
  const setNode = useCallback(
    (element: HTMLInputElement | null): void => {
      if (listener) {
        node.current?.removeEventListener('change', listener)
        element?.addEventListener('change', listener)
      }
      node.current = element
      forward?.(element)
    },
    [forward, listener],
  )
  useLayoutEffect(() => {
    if (node.current) node.current.indeterminate = indeterminate ?? false
  }, [indeterminate])
  const handleChange =
    onChange || onCheckedChange || checked !== undefined
      ? (event: ChangeEvent<HTMLInputElement>): void => {
          if (nativeChangeEvent) return
          const next = event.currentTarget.checked
          onChange?.(event)
          onCheckedChange?.(next)
        }
      : undefined
  return createElement(
    as,
    webElementAttributes(
      props,
      { onChange: handleChange, ref: setNode },
      {
        onCheckedChange: 'onChange',
      },
    ),
  )
}
