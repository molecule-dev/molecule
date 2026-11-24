/**
 * Components that read a node prop where it renders, so its components are created and disposed
 * with the element that shows them, as React mounts them.
 *
 * @module
 */

import {
  type Accessor,
  children,
  createMemo,
  createRenderEffect,
  createSignal,
  type JSX,
  onCleanup,
  type ResolvedChildren,
  Show,
} from 'solid-js'

import { rendersNode } from './node.js'

/** Props for {@link ResolveNode}. */
export interface ResolveNodeProps {
  /** The node prop, as the component received it (`local.footer`). */
  node: unknown
  /**
   * Renders from the resolved node: `node()` is the node to insert (insert it once: resolved nodes
   * are real DOM nodes, and a second insertion moves them), `present()` whether it renders
   * anything by React's `slot(node)` rule. The callback runs once, like a component body: branch on
   * `present()` inside the JSX it returns (`<Show when={present()} fallback={…}>`), since a
   * `present() ? a : b` returned from the callback itself is read once and never updates.
   */
  children: (node: Accessor<ResolvedChildren>, present: Accessor<boolean>) => JSX.Element
}

/**
 * Resolves a node prop once, in the place where it is put, and always renders its callback. Use it
 * when something besides the node's own wrapper reads whether the node renders anything: a default
 * that replaces it (Alert's status icon, Table's empty text), a class on a sibling (Input's
 * padding), an `aria-describedby` that points at it. For a wrapper that exists only while the node
 * renders something, use {@link PresentWhileNode}.
 *
 * Put it at the highest point inside the branch that shows the node and still contains every
 * reader (inside a dialog's open branch, not at the top of the dialog component). The node's
 * components are created when this is rendered and disposed with it, so a closed dialog creates
 * none of them and each opening creates them again, as React mounts them. Resolving the prop with
 * `children()` at the top of the component instead creates them while the branch is hidden (their
 * effects and fetches run) and keeps one instance across close and reopen.
 *
 * @example
 * ```tsx
 * <ResolveNode node={local.leftElement}>
 *   {(left, hasLeft) => (
 *     <>
 *       <Show when={hasLeft()}><div class={cm.inputLeftElement}>{left()}</div></Show>
 *       <input class={cm.cn(cm.input(), hasLeft() && cm.inputPadLeft)} />
 *     </>
 *   )}
 * </ResolveNode>
 * ```
 *
 * @param props - The node prop and the render callback (see {@link ResolveNodeProps}).
 * @returns What the callback renders.
 */
export function ResolveNode(props: ResolveNodeProps): JSX.Element {
  // The single conversion from the core's untyped node prop to Solid's children.
  const node = children(() => props.node as JSX.Element)
  const present = createMemo(() => rendersNode(node()))
  // A component body runs once and untracked, so the callback renders once; its readers track.
  return props.children(node, present)
}

/** Props for {@link PresentWhileNode}. */
export interface PresentWhileNodeProps {
  /** The node prop, as the component received it (`local.footer`). */
  node: unknown
  /** Renders the wrapper around the resolved node; insert `node()` once. */
  children: (node: Accessor<ResolvedChildren>) => JSX.Element
}

/**
 * Renders its callback only while the node prop renders something: React's
 * `slot(footer) && <div>{footer}</div>`. A node that renders nothing (`null`, `false`, `''`, an
 * empty list, a `<For>` over no rows) leaves no wrapper, like an omitted prop. Place it where the
 * wrapper goes; the node's components are created and disposed with it (see {@link ResolveNode}).
 *
 * @example
 * ```tsx
 * <PresentWhileNode node={local.footer}>
 *   {(footer) => <div class={cm.dialogFooter}>{footer()}</div>}
 * </PresentWhileNode>
 * ```
 *
 * @param props - The node prop and the wrapper callback (see {@link PresentWhileNodeProps}).
 * @returns The wrapper while the node renders something, else nothing.
 */
export function PresentWhileNode(props: PresentWhileNodeProps): JSX.Element {
  return (
    <ResolveNode node={props.node}>
      {(node, present) => <Show when={present()}>{props.children(node)}</Show>}
    </ResolveNode>
  )
}

/** What {@link createNodePresence} returns. */
export interface NodePresence {
  /** Whether the node renders something while its scope is rendered; false while it is not. */
  present: Accessor<boolean>
  /** Call inside the scope's callback with its `present` accessor. */
  report: (present: Accessor<boolean>) => void
}

/**
 * Carries a node's presence out of the branch that renders it, for a reader outside that branch:
 * a dialog's `aria-labelledby` is a prop of `Modal`, set before Modal's open branch renders the
 * heading it names. The node stays resolved inside the branch (see {@link ResolveNode}), so it is
 * still created only while shown, and `present()` is false whenever the scope is not rendered.
 *
 * @example
 * ```tsx
 * const title = createNodePresence()
 * <Modal open={local.open} aria-labelledby={title.present() ? titleId : undefined}>
 *   <ResolveNode node={local.title}>
 *     {(node, present) => {
 *       title.report(present)
 *       return <h2 id={present() ? titleId : undefined}>{node()}</h2>
 *     }}
 *   </ResolveNode>
 * </Modal>
 * ```
 *
 * @returns The presence and the function the scope reports it with.
 */
export function createNodePresence(): NodePresence {
  const [present, setPresent] = createSignal(false)
  return {
    present,
    report: (scopePresent) => {
      createRenderEffect(() => setPresent(scopePresent()))
      onCleanup(() => setPresent(false))
    },
  }
}
