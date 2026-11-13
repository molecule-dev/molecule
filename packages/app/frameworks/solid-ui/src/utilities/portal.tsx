/**
 * Wrapper-less body portal — the Solid equivalent of React's
 * `createPortal(node, document.body)`.
 *
 * Solid's own `Portal` always appends an extra `<div>` container to the mount
 * target and renders the children inside it; React's `createPortal` inserts
 * the node itself. The extra wrapper changes the DOM (and focus paths), so
 * components that must match React's rendered tree portal through this helper
 * instead: the rendered node is appended to `document.body` directly.
 *
 * @module
 */

import { type Component, type JSX, onCleanup } from 'solid-js'

/**
 * Renders its children directly under `document.body` (no wrapper element),
 * removing the nodes again when the component unmounts. Multiple children
 * (a fragment) are appended as siblings — React's `createPortal` inserts a
 * fragment's elements directly into the mount target, and this matches it.
 *
 * @param props - The children to portal into `document.body`.
 * @returns Nothing — the children render into `document.body`, not inline.
 */
export const BodyPortal: Component<{ children: JSX.Element }> = (props) => {
  if (typeof document === 'undefined') return undefined
  // Evaluated once: the children keep this component's owner, so context
  // (providers, theme services) flows exactly as it would inline.
  const value = props.children as Node | Node[]
  const nodes = Array.isArray(value) ? value : [value]
  for (const node of nodes) document.body.appendChild(node)
  onCleanup(() => {
    for (const node of nodes) node.parentNode?.removeChild(node)
  })
  return undefined
}
