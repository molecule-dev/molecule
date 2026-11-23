import { Fragment, isValidElement, type ReactNode } from 'react'

/**
 * Whether a React node renders anything: not `null`, `undefined`, a boolean or `''`, and not a
 * list or fragment that holds only those. An element counts even when its component renders
 * nothing, since only rendering it can tell.
 *
 * @param node - The node.
 * @returns True when it renders something.
 */
function rendersSomething(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean' || node === '') return false
  if (Array.isArray(node)) return node.some(rendersSomething)
  if (isValidElement(node) && node.type === Fragment)
    return rendersSomething((node.props as { children?: ReactNode }).children)
  return true
}

/**
 * A node prop as the component should treat it: `undefined` when it renders nothing (`null`,
 * `undefined`, a boolean, `''`, or a list or fragment holding only those), the node itself
 * otherwise. Read each node prop through it once, where the props are destructured
 * (`const title = slot(titleProp)`), so `title && <h2>…</h2>`, `icon ?? fallback` and an
 * `aria-labelledby` that points at the title decide the same way for `cond && <X/>`, `[]` and a
 * prop that was never passed, as a Vue, Svelte, Solid or Angular port deciding from its slot
 * content does.
 *
 * @param node - The node prop.
 * @returns The node, or `undefined` when it renders nothing.
 */
export function slot<T extends ReactNode>(node: T): T | undefined {
  return rendersSomething(node) ? node : undefined
}
