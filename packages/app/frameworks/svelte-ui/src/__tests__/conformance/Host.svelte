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
</script>

{#snippet tree(list: NodeSpec[])}
  <Tree nodes={list} />
{/snippet}

<Target {...shown} {...nodeProps} />
