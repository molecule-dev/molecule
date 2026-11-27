import {
  type PointerEventHandler,
  type RefCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import { createWebDrag } from '@molecule/app-pointer-events-dom'
import type { ElementDragProps } from '@molecule/app-ui'

import { mergeRefs } from '../utilities/mergeRefs.js'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Offers React's bubbling pointer press and the mounted host to the same gesture owner.
 *
 * @param options - The element's current drag and zoom handlers.
 * @param ref - The element's existing ref.
 * @param hostTag - Changes when a polymorphic element replaces its host.
 * @returns The host bindings for the element.
 */
export function useWebDrag<T extends HTMLElement | SVGElement>(
  options: ElementDragProps,
  ref?: RefCallback<T>,
  hostTag?: string,
): { ref?: RefCallback<T>; onPointerDown?: PointerEventHandler<T> } {
  const [gesture] = useState(() => createWebDrag(options))
  const enabled = Boolean(options.drag || options.zoom)
  const zoom = Boolean(options.zoom)

  useIsomorphicLayoutEffect(() => {
    gesture.update(options)
  })
  useIsomorphicLayoutEffect(() => gesture.cancel, [gesture, enabled, hostTag])

  return {
    ref: useMemo(() => (zoom ? mergeRefs<T>(gesture.attach, ref) : ref), [gesture, ref, zoom]),
    onPointerDown: enabled
      ? (event) => gesture.start(event.currentTarget, event.nativeEvent, options.drag, event.target)
      : undefined,
  }
}
