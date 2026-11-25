/**
 * Box: a container element.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, useCallback, useEffect, useRef } from 'react'

import type { BoxProps, ElementHandle, KitMouseEvent } from '@molecule/app-ui'

import { useWebDrag } from './drag.js'
import { useWebHover } from './hover.js'
import { pasteHandler } from './paste.js'
import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
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
  { as, children, drag, onPressOutside, secondaryAction, ...props },
  ref,
): ReactElement {
  const { hidden, onDoubleClick, onMouseEnter, onMouseLeave, onPasteText, onTouchStart } = props
  const node = useRef<HTMLElement>(null)
  const forward = useElementRef<HTMLElement>(ref)
  const setNode = useCallback(
    (element: HTMLElement | null): void => {
      node.current = element
      forward?.(element)
    },
    [forward],
  )
  const pointerDown = useWebDrag(hidden ? undefined : drag, as)
  const hover = useWebHover<HTMLElement>({ onMouseEnter, onMouseLeave })
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
    webElementAttributes(
      props,
      {
        ...hover,
        ref: onPressOutside ? setNode : forward,
        onPointerDown: pointerDown,
        onTouchStart: onTouchStart ? () => onTouchStart() : undefined,
        onDoubleClick: secondaryAction
          ? (event: KitMouseEvent): void => {
              onDoubleClick?.(event)
              if (!event.defaultPrevented) secondaryAction.run()
            }
          : onDoubleClick,
        onPaste: pasteHandler(onPasteText),
      },
      { onPasteText: 'onPaste' },
    ),
    children,
  )
})
