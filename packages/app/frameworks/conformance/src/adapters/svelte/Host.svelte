<!--
  Conformance host: provides the Molecule context, then renders the component
  under test with the case's props (node values and render functions inside
  them as snippets), its children and node-valued props as snippets (rendered
  by Tree), and the reactive prop bag for prop updates.
-->
<script lang="ts">
  import { type Component, untrack } from 'svelte'

  import type { NodeSpec } from '../../ui/index.js'
  import type { SvelteMoleculeConfig } from '../svelte.js'
  import { snippetBuilders } from './snippets.js'
  import Tree from './Tree.svelte'

  let {
    component: Target,
    exports: exportsOf,
    setMoleculeContext,
    callback,
    config,
    awaitSession,
    bag,
    slots,
    children,
  }: {
    component: Component<Record<string, unknown>>
    /** Every component and composable the cases may render or call. */
    exports: Record<string, unknown>
    setMoleculeContext: (config: SvelteMoleculeConfig) => void
    /** Builds the recording spy for a nested `{ $callback }` in the running case. */
    callback?: (name: string) => (...args: unknown[]) => unknown
    config: SvelteMoleculeConfig
    /** Hold the component until the auth client decides the session (React's AuthProvider default). */
    awaitSession: boolean
    bag: { props: Record<string, unknown> }
    slots: Record<string, NodeSpec[]>
    children?: NodeSpec[]
  } = $props()

  // The case's services, the binding's context setter and the callback spy are
  // fixed for its whole run.
  untrack(() => setMoleculeContext(config))

  const builders = snippetBuilders(
    tree,
    untrack(() => callback),
  )

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
  // The full composition root (React's MoleculeProvider, `awaitSession: false`)
  // does not wait.
  const authClient = untrack(() => config.auth)
  const sessionDecided =
    !untrack(() => awaitSession) || !authClient || authClient.getState().status !== 'loading'
</script>

{#snippet tree(list: NodeSpec[])}
  <Tree nodes={list} exports={exportsOf} {callback} />
{/snippet}

<!-- Mirrors the React reference adapter, which renders the case inside its own
     data-parity-unwrap div within the harness container; the normalizer drops
     the wrapper, but the focused-element path sees the real DOM nesting. -->
<div data-parity-unwrap>
  {#if sessionDecided}
    <Target {...shown} {...nodeProps} />
  {/if}
</div>
