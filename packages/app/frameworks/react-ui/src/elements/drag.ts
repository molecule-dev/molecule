import { type PointerEventHandler, useEffect, useLayoutEffect, useState } from 'react'

import { createWebDrag } from '@molecule/app-pointer-events-dom'
import type { ElementDrag } from '@molecule/app-ui'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Offers a React element's press to the web kits' shared drag gesture.
 *
 * @param drag - The current drag handlers.
 * @param hostTag - Changes when a polymorphic element replaces its host.
 * @returns The down handler for the existing DOM host.
 */
export function useWebDrag<T extends HTMLElement | SVGElement>(
  drag: ElementDrag | undefined,
  hostTag?: string,
): PointerEventHandler<T> | undefined {
  const [gesture] = useState(() => createWebDrag(drag))
  const enabled = Boolean(drag)

  useIsomorphicLayoutEffect(() => {
    gesture.update(drag)
  })
  useIsomorphicLayoutEffect(() => gesture.cancel, [gesture, enabled, hostTag])

  if (!drag) return undefined
  return (event) => gesture.start(event.currentTarget, event.nativeEvent, drag, event.target)
}
