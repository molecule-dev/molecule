/**
 * Wrapper-less body portal — the Solid equivalent of React's
 * `createPortal(children, target)`.
 *
 * Solid's own `Portal` appends a container `<div>` to the mount target and
 * renders inside it (it renders without one only into `<head>`); React inserts
 * the children themselves. This is that head branch for any target: Solid's
 * `insert` places and reconciles the children as direct children of the target,
 * so anything Solid can render works here (`<Show>`, `<For>`, text, a
 * conditional) and stays reactive.
 *
 * @module
 */

import {
  children,
  type Component,
  createEffect,
  createMemo,
  type JSX,
  onCleanup,
  sharedConfig,
  untrack,
} from 'solid-js'
import { insert } from 'solid-js/web'

/** Props for {@link BodyPortal}. */
export interface BodyPortalProps {
  /** The content to render into the target, as React's `createPortal` children. */
  children?: JSX.Element
  /**
   * The node the content renders into. `undefined` mounts into
   * `document.body`; `null` renders nothing until it becomes a node (for a
   * target the caller does not have yet).
   */
  mount?: Node | null
}

/**
 * Renders its children directly under a target node (no wrapper element) and
 * removes them when the component unmounts. New children are added after the
 * portal's last child, as React's portal adds them.
 *
 * @param props - The children to portal and the optional mount target.
 * @returns Nothing — the children render into the target, not inline.
 */
export const BodyPortal: Component<BodyPortalProps> = (props) => {
  if (typeof document === 'undefined') return undefined
  // While hydrating, the content is created after hydration (as Solid's Portal does):
  // the server rendered nothing for it.
  const hydrating = !!sharedConfig.context
  createEffect(
    () => {
      const parent = props.mount === undefined ? document.body : props.mount
      if (!parent) return
      // Resolved under this component's owner, so context flows as it would inline.
      const resolved = children(() => props.children)
      // Every node in the target is one this component holds: text becomes a text node
      // here, and an empty list is one empty text node, so the cleanup below sees all of
      // them and `insert` never takes its clear-the-parent path.
      const empty = document.createTextNode('')
      const nodes = createMemo<Node[]>(() => {
        const list: Node[] = []
        for (const value of resolved.toArray()) {
          if (value instanceof Node) list.push(value)
          else if (value !== null && value !== undefined && typeof value !== 'boolean')
            list.push(document.createTextNode(String(value)))
        }
        return list.length > 0 ? list : [empty]
      })
      insert(parent, nodes, null)
      onCleanup(() => {
        for (const node of untrack(nodes)) node.parentNode?.removeChild(node)
      })
    },
    undefined,
    { render: !hydrating },
  )
  return undefined
}
