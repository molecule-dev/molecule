/**
 * Merges a component's forwarded ref with its own internal ref.
 *
 * @module
 */
import type React from 'react'

/**
 * Merges multiple refs (object or callback) into a single callback ref, so an internal ref
 * (focus-trap or positioning bookkeeping) can coexist with the consumer's forwarded ref on the
 * same DOM node.
 *
 * @param refs - The refs to merge; `undefined`/`null` entries are skipped.
 * @returns A single callback ref that updates every merged ref.
 */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (node: T | null) => {
    for (const r of refs) {
      if (!r) continue
      if (typeof r === 'function') {
        r(node)
      } else {
        r.current = node
      }
    }
  }
}
