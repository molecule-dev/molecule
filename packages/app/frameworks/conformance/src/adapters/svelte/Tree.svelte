<!--
  Renders conformance NodeSpecs as real Svelte content: text, elements, hook
  probes and the export map's own components (with children, named slots and
  node values inside props as snippets), so compound components see their
  parent's context exactly as in an app.
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import { isComponentSpec, isProbeSpec, type NodeSpec } from '../../ui/index.js'
  import Probe from './Probe.svelte'
  import { snippetBuilders } from './snippets.js'
  import Tree from './Tree.svelte'

  let {
    nodes,
    exports: exportsOf,
    callback,
  }: {
    nodes: NodeSpec[]
    /** Every component and composable the cases may render or call. */
    exports: Record<string, unknown>
    /** Builds the recording spy for a nested `{ $callback }` in the running case. */
    callback?: (name: string) => (...args: unknown[]) => unknown
  } = $props()

  // The export map and the callback spy are fixed for the case's whole run.
  const components = untrack(() => exportsOf) as Record<string, Component<Record<string, unknown>>>
  const builders = snippetBuilders(
    tree,
    untrack(() => callback),
  )
</script>

{#snippet tree(list: NodeSpec[])}
  <Tree nodes={list} exports={exportsOf} {callback} />
{/snippet}

{#each nodes as node, i (i)}
  {#if typeof node === 'string'}
    {node}
  {:else if isProbeSpec(node)}
    <Probe spec={node} exports={exportsOf} />
  {:else if isComponentSpec(node)}
    {@const Target = components[node.component]}
    <Target {...builders.propsOf(node)} />
  {:else}
    <svelte:element this={node.tag} {...node.attrs ?? {}}
      ><Tree nodes={node.children ?? []} exports={exportsOf} {callback} /></svelte:element
    >
  {/if}
{/each}
