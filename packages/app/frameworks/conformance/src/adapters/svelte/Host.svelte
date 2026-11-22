<!--
  Conformance host: provides the Molecule context, then renders the component
  under test with the case's props (node values and render functions inside
  them as snippets), its children and node-valued props as snippets (rendered
  by Tree), and the reactive prop bag for prop updates.
-->
<script lang="ts">
  import { type Component, setContext, untrack } from 'svelte'

  import type { Router } from '@molecule/app-routing'

  import type { NodeSpec } from '../../ui/index.js'
  import type { SvelteMoleculeConfig } from '../svelte.js'
  import { ROUTED_TEXT_KEY } from '../svelte-bindings/routed-text.js'
  import RoutedText from '../svelte-bindings/RoutedText.svelte'
  import { snippetBuilders } from './snippets.js'
  import Tree from './Tree.svelte'

  let {
    component: Target,
    exports: exportsOf,
    setMoleculeContext,
    setRouterContext,
    routedPage,
    callback,
    config,
    awaitSession,
    bag,
    slots,
    children,
    captureRef,
    firstRender,
  }: {
    component: Component<Record<string, unknown>>
    /** Every component and composable the cases may render or call. */
    exports: Record<string, unknown>
    setMoleculeContext: (config: SvelteMoleculeConfig) => void
    /** The binding's router setter, which also takes the routing bond's routed view. */
    setRouterContext: (router: Router, options?: { routedView?: Component }) => void
    /** The case's `context.routedPage`: the text the routed view renders. */
    routedPage?: string
    /** Builds the recording spy for a nested `{ $callback }` in the running case. */
    callback?: (name: string) => (...args: unknown[]) => unknown
    config: SvelteMoleculeConfig
    /** Hold the component until the auth client decides the session (React's AuthProvider default). */
    awaitSession: boolean
    bag: { props: Record<string, unknown> }
    slots: Record<string, NodeSpec[]>
    children?: NodeSpec[]
    /** Set for a ref case: receives what the component's bindable `ref` prop holds (`bind:ref`). */
    captureRef?: (el: unknown) => void
    /**
     * Set while the adapter first mounts the case: an error the component throws then is held
     * here instead of escaping `mount` half-way, which would leave the tree it had set up
     * running into the cases after it. The adapter unmounts the host and rethrows it.
     */
    firstRender?: { mounting: boolean; errors: unknown[] }
  } = $props()

  /**
   * Holds an error thrown while the case first mounts; later errors propagate as before.
   *
   * @param error - What the component threw.
   */
  const onTargetError = (error: unknown): void => {
    if (!firstRender?.mounting) throw error
    firstRender.errors.push(error)
  }

  // What the component's `ref` holds, read back by the component itself through the binding.
  let boundRef = $state.raw<unknown>(null)
  const setBoundRef = (el: unknown): void => {
    boundRef = el
    captureRef?.(el)
  }

  // The case's services, the binding's context setter and the callback spy are
  // fixed for its whole run.
  untrack(() => setMoleculeContext(config))
  // The routing bond's routed view, as an app's router component provides it: the case's
  // `routedPage` text, or nothing.
  untrack(() => {
    setContext(ROUTED_TEXT_KEY, routedPage ?? '')
    if (config.router) setRouterContext(config.router, { routedView: RoutedText })
  })

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
  // Each prop is materialized once and kept while its value is unchanged, as an app keeps
  // its snippets: a props step that changes `query` must not hand the component a NEW
  // `children` snippet (`{@render}` re-creates the content of a new snippet, where React
  // re-renders the same nodes).
  // A plain record, not reactive state: it only remembers the previous run's values.
  let materialized: Record<string, { raw: unknown; value: unknown }> = {}
  const shown = $derived.by(() => {
    const next: Record<string, { raw: unknown; value: unknown }> = {}
    const out: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(bag.props)) {
      const kept = materialized[key]
      const value =
        kept && kept.raw === raw ? kept.value : builders.materialize({ [key]: raw })[key]
      next[key] = { raw, value }
      out[key] = value
    }
    materialized = next
    return out
  })

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
  <svelte:boundary onerror={onTargetError}>
    {#if sessionDecided}
      <!-- Only a ref case binds `ref`: binding a prop a component does not declare bindable throws. -->
      {#if captureRef}
        <Target {...shown} {...nodeProps} bind:ref={() => boundRef, setBoundRef} />
      {:else}
        <Target {...shown} {...nodeProps} />
      {/if}
    {/if}
  </svelte:boundary>
</div>
