/**
 * Builds Svelte snippets for conformance node lists from a `.svelte` file's own
 * `tree` snippet, so the nodes render as real Svelte content under that file's
 * component tree (and see its context).
 *
 * @module
 */

import type { Snippet } from 'svelte'

import {
  type FnValue,
  interpolateNodes,
  isComponentSpec,
  materializeProps,
  type NodeSpec,
} from '../../ui/index.js'

/** Builds the recording spy for a nested `{ $callback }` in the running case. */
type CallbackSpy = (name: string) => (...args: unknown[]) => unknown

/**
 * The props a component handed a snippet built from a node list, spread onto that list's single
 * element node when there is one.
 *
 * A Svelte component that hands a snippet props (a Dropdown's `trigger` receiving what React's
 * `cloneElement` injects) expects the snippet to spread them on its root element, the convention
 * of Svelte UI kits: `{#snippet trigger(props)}<button {...props}>Menu</button>{/snippet}`. A
 * conformance slot is a node list, not a snippet that spreads anything, so the adapter applies the
 * same convention: when the snippet is called with an object argument and the list is exactly one
 * element node, the argument is spread onto that element (its attrs, symbol attachment keys
 * included). Any other list — text, several nodes, a component — ignores the argument, and the
 * component falls back to whatever it does for a trigger it cannot clone.
 *
 * @param list - The node list the snippet renders.
 * @param arg - The argument the component passed to the snippet, if any.
 * @returns The list to render: the same list, or its single element with the argument merged in.
 */
function withSnippetProps(list: NodeSpec[], arg: unknown): NodeSpec[] {
  if (list.length !== 1) return list
  if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) return list
  const node = list[0]!
  if (typeof node === 'string' || !('tag' in node)) return list
  // The spread copies own enumerable properties, symbol keys included, which is how an attachment
  // key (`createAttachmentKey()`) reaches the element the case's node list renders.
  return [{ ...node, attrs: { ...(node.attrs ?? {}), ...(arg as Record<string, string>) } }]
}

/** Builders bound to one `.svelte` file's `tree` snippet. */
export interface SnippetBuilders {
  /** A snippet rendering a node list; a single element node takes the props the caller passes. */
  snippetOf(list: NodeSpec[]): Snippet
  /**
   * One snippet for a list that changes: it renders the list `read` returns now, and follows it,
   * as a consumer's `{#each}` inside one snippet does (a new snippet would make `{@render}`
   * re-create the content).
   */
  liveSnippetOf(read: () => NodeSpec[]): Snippet
  /** The `children` snippet of a list component: renders the one entry it is called with. */
  itemSnippet: Snippet<[NodeSpec]>
  /** Props with `{ $nodes }` → snippets, render functions → `Snippet<[args]>` and `{ $callback }` → spies. */
  materialize(props: Record<string, unknown>): Record<string, unknown>
  /** A component node's props, slots and children, ready to spread. */
  propsOf(node: NodeSpec): Record<string, unknown>
}

/**
 * Creates the builders for one `.svelte` file.
 *
 * @param tree - That file's `{#snippet tree(list)}` snippet.
 * @param callback - Builds the recording spy for a nested `{ $callback }` in a data prop.
 * @returns The builders.
 */
export function snippetBuilders(
  tree: Snippet<[NodeSpec[]]>,
  callback?: CallbackSpy,
): SnippetBuilders {
  // The Svelte compiler calls snippets with an anchor and reactive argument getters.
  // The public Snippet type only describes the arguments written in a render tag.
  type CompiledTree = (anchor: unknown, read: () => NodeSpec[]) => ReturnType<Snippet>
  const renderTree = tree as typeof tree & CompiledTree
  const snippetOf =
    (list: NodeSpec[]): Snippet =>
    (anchor?: unknown, props?: () => unknown) =>
      renderTree(anchor, () => withSnippetProps(list, props?.()))
  const liveSnippetOf =
    (read: () => NodeSpec[]): Snippet =>
    (anchor?: unknown, props?: () => unknown) =>
      renderTree(anchor, () => withSnippetProps(read(), props?.()))
  // A render function prop is a snippet with arguments: `{@render column.render(row)}`.
  const renderSnippet =
    (spec: FnValue & { nodes: NodeSpec[] }): Snippet<unknown[]> =>
    (anchor?: unknown, ...args: (() => unknown)[]) =>
      renderTree(anchor, () =>
        interpolateNodes(
          spec.nodes,
          args.map((get) => get()),
        ),
      )
  const itemSnippet: Snippet<[NodeSpec]> = (anchor: unknown, item?: () => NodeSpec) => {
    if (!item) throw new Error('Svelte did not pass the list item getter')
    return renderTree(anchor, () => [item()])
  }
  const materialize = (props: Record<string, unknown>): Record<string, unknown> =>
    materializeProps(props, { nodes: snippetOf, renderFn: renderSnippet, callback })
  const propsOf = (node: NodeSpec): Record<string, unknown> => {
    if (!isComponentSpec(node)) return {}
    const out = materialize(node.props ?? {})
    for (const [slot, list] of Object.entries(node.slots ?? {})) out[slot] = snippetOf(list)
    if (node.children) out.children = snippetOf(node.children)
    return out
  }
  return { snippetOf, liveSnippetOf, itemSnippet, materialize, propsOf }
}
