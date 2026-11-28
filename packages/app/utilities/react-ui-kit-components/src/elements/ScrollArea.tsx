/**
 * ScrollArea: a container that scrolls.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement, type UIEvent, useRef } from 'react'

import type { ElementHandle, ScrollAreaProps, ScrollOffset } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode } from './types.js'

/**
 * A scrolling container: renders exactly its `as` tag. Its web scrolling comes from its ClassMap
 * classes and styles. On React Native it scrolls in the supplied `direction`.
 *
 * @param props - See {@link ScrollAreaProps}.
 * @param ref - The scroll frame rendered by `as`.
 * @returns The element.
 */
export const ScrollArea = forwardRef<ElementHandle, ScrollAreaProps<ElementNode>>(
  function ScrollArea({ as, direction: _direction, children, ...props }, ref): ReactElement {
    const { onScroll } = props
    const last = useRef<ScrollOffset>(null)
    const handleScroll = (event: UIEvent<HTMLElement>): void => {
      const host = event.currentTarget
      if (event.target !== host) return
      const maxX = Math.max(0, host.scrollWidth - host.clientWidth)
      const maxY = Math.max(0, host.scrollHeight - host.clientHeight)
      const rtl = host.ownerDocument.defaultView?.getComputedStyle(host).direction === 'rtl'
      const offset = {
        x: clampOffset(rtl ? maxX + host.scrollLeft : host.scrollLeft, host.clientWidth, maxX),
        y: clampOffset(host.scrollTop, host.clientHeight, maxY),
      }
      if (last.current?.x === offset.x && last.current.y === offset.y) return
      last.current = offset
      onScroll?.(offset)
    }
    return createElement(
      as,
      webElementAttributes(props, { ref: useElementRef(ref), onScroll: onScroll && handleScroll }),
      children,
    )
  },
)

/** Excludes browser bounce, using the scroll extent when the host has layout. */
function clampOffset(value: number, viewport: number, max: number): number {
  return Math.max(0, viewport > 0 ? Math.min(value, max) : value)
}
