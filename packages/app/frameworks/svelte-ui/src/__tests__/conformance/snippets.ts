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
} from '@molecule/app-framework-conformance/ui'

/** A compiled snippet's calling convention: `(anchor, ...argument getters)`. */
type CompiledSnippet = (anchor: unknown, ...args: (() => unknown)[]) => void

/** Builders bound to one `.svelte` file's `tree` snippet. */
export interface SnippetBuilders {
  /** A zero-argument snippet rendering a node list. */
  snippetOf(list: NodeSpec[]): Snippet
  /** Props with `{ $nodes }` → snippets and render functions → `Snippet<[args]>`. */
  materialize(props: Record<string, unknown>): Record<string, unknown>
  /** A component node's props, slots and children, ready to spread. */
  propsOf(node: NodeSpec): Record<string, unknown>
}

/**
 * Creates the builders for one `.svelte` file.
 *
 * @param tree - That file's `{#snippet tree(list)}` snippet.
 * @returns The builders.
 */
export function snippetBuilders(tree: Snippet<[NodeSpec[]]>): SnippetBuilders {
  const compiled = tree as unknown as CompiledSnippet
  const snippetOf = (list: NodeSpec[]): Snippet =>
    ((anchor: unknown) => compiled(anchor, () => list)) as unknown as Snippet
  // A render function prop is a snippet with arguments: `{@render column.render(row)}`.
  const renderSnippet = (spec: FnValue & { nodes: NodeSpec[] }): Snippet<unknown[]> =>
    ((anchor: unknown, ...args: (() => unknown)[]) =>
      compiled(anchor, () =>
        interpolateNodes(
          spec.nodes,
          args.map((get) => get()),
        ),
      )) as unknown as Snippet<unknown[]>
  const materialize = (props: Record<string, unknown>): Record<string, unknown> =>
    materializeProps(props, { nodes: snippetOf, renderFn: renderSnippet })
  const propsOf = (node: NodeSpec): Record<string, unknown> => {
    if (!isComponentSpec(node)) return {}
    const out = materialize(node.props ?? {})
    for (const [slot, list] of Object.entries(node.slots ?? {})) out[slot] = snippetOf(list)
    if (node.children) out.children = snippetOf(node.children)
    return out
  }
  return { snippetOf, materialize, propsOf }
}
