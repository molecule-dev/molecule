/**
 * Hands a native host view to an element's `ref`.
 *
 * @module
 */

import { type Ref, type RefCallback, useCallback } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

/**
 * A stable callback ref that passes the host view (which has `focus()` and `blur()`) to the
 * caller's ref, whether it is a callback or a ref object.
 *
 * @param ref - The caller's ref, if any.
 * @returns A callback ref for the host view, or `undefined` when there is no ref.
 */
export function useNativeRef<T extends ElementHandle>(
  ref: Ref<ElementHandle> | undefined,
): RefCallback<T> | undefined {
  const callback = useCallback(
    (instance: T | null): void => {
      if (typeof ref === 'function') ref(instance)
      else if (ref) ref.current = instance
    },
    [ref],
  )
  return ref ? callback : undefined
}
