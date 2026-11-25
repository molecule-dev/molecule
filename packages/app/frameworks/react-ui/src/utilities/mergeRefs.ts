/**
 * Merges a component's forwarded ref with its own internal ref.
 *
 * @module
 */
import type { RefCallback } from 'react'

type Ref<T> = RefCallback<T> | { current: T | null } | null | undefined

/** Updates either ref shape. React 18's types report callback results as void. */
function applyRef<T>(ref: Ref<T>, node: T | null): unknown {
  if (typeof ref === 'function') return ref(node)
  if (ref) ref.current = node
}

/**
 * Merges multiple refs (object or callback) into a single callback ref, so an internal ref
 * (focus-trap or positioning bookkeeping) can coexist with the consumer's forwarded ref on the
 * same DOM node.
 *
 * @param refs - The refs to merge; `undefined`/`null` entries are skipped.
 * @returns A callback that attaches the refs and preserves their detach behavior.
 */
export function mergeRefs<T>(...refs: Ref<T>[]): RefCallback<T> {
  return (node: T | null) => {
    const cleanups = refs.map((ref) => applyRef(ref, node))
    if (node === null || !cleanups.some((cleanup) => typeof cleanup === 'function')) return
    // React 19 calls this instead of passing null to the merged callback. Refs
    // without a cleanup still need their normal detach.
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index]
        if (typeof cleanup === 'function') cleanup()
        else applyRef(ref, null)
      })
    }
  }
}
