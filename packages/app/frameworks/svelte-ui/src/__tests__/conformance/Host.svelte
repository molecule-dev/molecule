<!--
  Conformance host: provides the Molecule context, then renders the component
  under test with the case's props (node values and render functions inside
  them as snippets), its children and node-valued props as snippets (rendered
  by Tree), and the reactive prop bag for prop updates.
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import type { NodeSpec } from '@molecule/app-framework-conformance/ui'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import { snippetBuilders } from './snippets.js'
  import Tree from './Tree.svelte'

  let {
    component: Target,
    config,
    bag,
    slots,
    children,
  }: {
    component: Component<Record<string, unknown>>
    config: Parameters<typeof setMoleculeContext>[0]
    bag: { props: Record<string, unknown> }
    slots: Record<string, NodeSpec[]>
    children?: NodeSpec[]
  } = $props()

  // The case's services are fixed for its whole run.
  setMoleculeContext(untrack(() => config))

  const builders = snippetBuilders(tree)

  const nodeProps = $derived.by(() => {
    const out: Record<string, unknown> = {}
    for (const [slot, list] of Object.entries(slots)) out[slot] = builders.snippetOf(list)
    if (children) out.children = builders.snippetOf(children)
    return out
  })
  const shown = $derived(builders.materialize(bag.props))

  // Mirrors the React reference adapter's AuthProvider, which holds the case
  // behind SessionReady (fallback null) until the auth client decides the
  // session: while a case's auth status is 'loading' the component under test
  // is not rendered at all. The fakes never transition out of 'loading'.
  const authClient = untrack(() => config.auth)
  const sessionDecided = !authClient || authClient.getState().status !== 'loading'
</script>

{#snippet tree(list: NodeSpec[])}
  <Tree nodes={list} />
{/snippet}

<!-- Mirrors the React reference adapter, which renders the case inside its own
     data-parity-unwrap div within the harness container; the normalizer drops
     the wrapper, but the focused-element path sees the real DOM nesting. -->
<div data-parity-unwrap>
  {#if sessionDecided}
    <Target {...shown} {...nodeProps} />
  {/if}
</div>
