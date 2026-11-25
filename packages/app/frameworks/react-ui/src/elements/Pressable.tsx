/**
 * Pressable: an element the user activates.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, useCallback } from 'react'

import type { ElementHandle, KitMouseEvent, PressableProps } from '@molecule/app-ui'

import { markPressTarget, useWebDrag } from './drag.js'
import { useWebHover } from './hover.js'
import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode } from './types.js'

/**
 * Something the user activates: renders exactly its `as` tag (`<Pressable as="button"
 * type="button">`) with its handlers. On React Native it is a `Pressable`; `onClick` fires on press
 * and a string child is drawn in a `Text`.
 *
 * @param props - See {@link PressableProps}.
 * @param ref - The element rendered by `as`.
 * @returns The element.
 */
export const Pressable = forwardRef<ElementHandle, PressableProps<ElementNode>>(function Pressable(
  { as, children, drag, secondaryAction, ...props },
  ref,
): ReactElement {
  const forward = useElementRef<HTMLElement>(ref)
  const setNode = useCallback(
    (element: HTMLElement | null): void => {
      if (element) markPressTarget(element)
      forward?.(element)
    },
    [forward],
  )
  const onPointerDown = useWebDrag(props.disabled ? undefined : drag, as)
  const hover = useWebHover<HTMLElement>(props)
  return createElement(
    as,
    webElementAttributes(props, {
      ...hover,
      ref: setNode,
      onPointerDown,
      onDoubleClick: secondaryAction
        ? (event: KitMouseEvent): void => {
            props.onDoubleClick?.(event)
            if (!props.disabled && !event.defaultPrevented) secondaryAction.run()
          }
        : props.onDoubleClick,
    }),
    children,
  )
})
