<!--
  Renders conformance NodeSpecs as real Svelte content: text, elements, hook
  probes and this package's own components (with children, named slots and
  node values inside props as snippets), so compound components see their
  parent's context exactly as in an app.
-->
<script lang="ts">
  import type { Component } from 'svelte'

  import { isComponentSpec, isProbeSpec, type NodeSpec } from '@molecule/app-framework-conformance/ui'

  import * as SvelteUI from '../../index.js'
  import Probe from './Probe.svelte'
  import { snippetBuilders } from './snippets.js'
  import Tree from './Tree.svelte'

  let { nodes }: { nodes: NodeSpec[] } = $props()

  const components = SvelteUI as unknown as Record<string, Component<Record<string, unknown>>>
  const builders = snippetBuilders(tree)
</script>

{#snippet tree(list: NodeSpec[])}
  <Tree nodes={list} />
{/snippet}

{#each nodes as node, i (i)}
  {#if typeof node === 'string'}
    {node}
  {:else if isProbeSpec(node)}
    <Probe spec={node} />
  {:else if isComponentSpec(node)}
    {@const Target = components[node.component]}
    <Target {...builders.propsOf(node)} />
  {:else}
    <svelte:element this={node.tag} {...node.attrs ?? {}}><Tree nodes={node.children ?? []} /></svelte:element>
  {/if}
{/each}
