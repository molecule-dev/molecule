/**
 * Renderable-children helpers for Vue ports of the molecule components.
 *
 * A Vue slot or node-valued prop does not arrive as the list a React child
 * list is: `v-for` compiles to one Fragment vnode holding the items, a false
 * `v-if` is a Comment vnode, and a rendered-nothing value is often an empty
 * text node. A port that maps, counts or slices its children has to flatten
 * that shape the way React counts children (`React.Children.toArray`).
 *
 * @module
 */

import { Comment, Fragment, isVNode, Text, toRaw, type VNodeChild } from 'vue'

/**
 * The renderable children of a slot result or a node-valued prop, flattened the
 * way React counts children (`React.Children.toArray`): an array and a `v-for`
 * Fragment contribute their entries in order, and the values React renders as
 * nothing — `null`, `undefined`, a boolean, an empty string, an empty text node
 * and a false `v-if` branch (a Comment vnode) — contribute nothing.
 *
 * Use it wherever a port needs the child list as data (map, `length`, `slice`).
 * Vue renders a Comment vnode as its own `<!---->` anchor and hands a `v-for`
 * over as a single Fragment vnode, so a raw slot result makes one `v-for` list
 * count as one child and a false branch count as a child of its own.
 *
 * The value is unwrapped with `toRaw` first: a node carried inside a reactive
 * object is a deep proxy, and rendering a proxied VNode both tracks its
 * properties in the render effect and writes them back while the VNode mounts —
 * a reactive loop. Vue keeps VNodes out of reactivity (`markRaw`), so render the
 * underlying node.
 *
 * @param value - The slot result, the node-valued prop, or one child.
 * @returns The children to render, in order, with arrays and Fragments flattened.
 */
export function toChildArray(value: VNodeChild | null | undefined): VNodeChild[] {
  const children: VNodeChild[] = []
  const visit = (child: VNodeChild | null | undefined): void => {
    const raw = toRaw(child)
    if (raw === null || raw === undefined || typeof raw === 'boolean') return
    if (Array.isArray(raw)) {
      for (const nested of raw) visit(nested as VNodeChild)
      return
    }
    if (typeof raw === 'string') {
      if (raw !== '') children.push(raw)
      return
    }
    if (isVNode(raw)) {
      if (raw.type === Comment) return
      if (raw.type === Text) {
        if (raw.children !== '') children.push(raw)
        return
      }
      if (raw.type === Fragment) {
        const nested = toRaw(raw.children)
        if (Array.isArray(nested)) for (const item of nested) visit(item as VNodeChild)
        return
      }
    }
    children.push(raw)
  }
  visit(value)
  return children
}
