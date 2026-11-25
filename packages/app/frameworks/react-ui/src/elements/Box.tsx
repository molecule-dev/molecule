/**
 * Box: a container element.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, useCallback, useEffect, useRef } from 'react'

import type { BoxProps, ElementHandle } from '@molecule/app-ui'

import { pasteHandler } from './paste.js'
import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode } from './types.js'

/**
 * A container: renders exactly its `as` tag (`<Box as="ul">` is a `<ul>`) with the props given.
 * On React Native it is a `View`. Text goes in a {@link Text}.
 *
 * @param props - See {@link BoxProps}.
 * @param ref - The element rendered by `as`.
 * @returns The element.
 */
export const Box = forwardRef<ElementHandle, BoxProps<ElementNode>>(function Box(
  { as, style, webStyle, children, onPasteText, onPressOutside, ...props },
  ref,
): ReactElement {
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
})
