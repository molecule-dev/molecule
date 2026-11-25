/**
 * Box: a container element.
 *
 * @module
 */

import { createElement, type ReactElement, useCallback, useEffect, useRef } from 'react'

import type { BoxProps } from '@molecule/app-ui'

import { pasteHandler } from './paste.js'
import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A container: renders exactly its `as` tag (`<Box as="ul">` is a `<ul>`) with the props given.
 * On React Native it is a `View`. Text goes in a {@link Text}.
 *
 * @param props - See {@link BoxProps}.
 * @returns The element.
 */
export function Box({
  as,
  style,
  webStyle,
  children,
  onPasteText,
  onPressOutside,
  ref,
  ...props
}: BoxProps<ElementNode> & ElementRefProps): ReactElement {
  const node = useRef<HTMLElement>(null)
  const forward = useElementRef<HTMLElement>(ref)
  const setNode = useCallback(
    (element: HTMLElement | null): void => {
      node.current = element
      forward?.(element)
    },
    [forward],
  )
  const hidden = props.hidden
  useEffect(() => {
    const element = node.current
    const ownerDocument = element?.ownerDocument
    const ownerWindow = ownerDocument?.defaultView
    if (hidden || !onPressOutside || !element || !ownerDocument || !ownerWindow) return
    const dismiss = (event: MouseEvent): void => {
      if (event.target instanceof ownerWindow.Node && !element.contains(event.target)) {
        onPressOutside()
      }
    }
    ownerDocument.addEventListener('mousedown', dismiss)
    return () => ownerDocument.removeEventListener('mousedown', dismiss)
  }, [as, hidden, onPressOutside])
  return createElement(
    as,
    {
      ...props,
      ref: onPressOutside ? setNode : forward,
      onPaste: pasteHandler(onPasteText),
      style: webElementStyle(style, webStyle),
    },
    children,
  )
}
