/**
 * Hands a DOM element to an element's `ref`.
 *
 * @module
 */

import { type Ref, type RefCallback, useCallback } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

/**
 * A stable callback ref that passes the DOM element (which satisfies {@link ElementHandle}) to the
 * caller's ref, whether it is a callback or a ref object.
 *
 * @param ref - The caller's ref, if any.
 * @returns A callback ref for the DOM element, or `undefined` when there is no ref.
 */
export function useElementRef<T extends HTMLElement | SVGElement>(
  ref: Ref<ElementHandle> | undefined,
): RefCallback<T> | undefined {
  const callback = useCallback(
    (element: T | null): void => {
      if (typeof ref === 'function') ref(element)
      else if (ref) ref.current = element
    },
    [ref],
  )
  return ref ? callback : undefined
}
