<!--
  Test host: renders the component under test with a props bag the test replaces in place
  through `setProps`, so the component updates without a remount — the way a parent's state
  change re-renders it. (`Host.svelte` plus a second `mount` remounts instead, which cannot
  tell an update's effect from a mount's.)
-->
<script lang="ts" generics="Props extends object">
  import { type Component, untrack } from 'svelte'

  import { type MoleculeConfig, setMoleculeContext } from '@molecule/app-svelte'

  let {
    config = {},
    component: Target,
    initial,
  }: {
    /** The test's provider config (a test may pass its own i18n provider). */
    config?: MoleculeConfig
    /** The component under test. */
    component: Component<Props>
    /** The props it first renders with. */
    initial: Props
  } = $props()

  // The context is registered once, at mount, from the test's config.
  untrack(() => setMoleculeContext(config))

  /** The props the test put in place of the first ones, if it has. */
  let replaced = $state<Props | undefined>(undefined)

  /** The props the component renders with: the first ones until the test replaces them. */
  const props = $derived(replaced ?? initial)

  /** Replaces the props bag, as a parent passing new props does. */
  export function setProps(next: Props): void {
    replaced = next
  }
</script>

<Target {...props} />
