<!--
  Test host: provides the molecule context, then renders the component under
  test with that component's own props, so every mount in the suite is checked
  against the props the component really accepts.
-->
<script lang="ts" generics="Props extends object">
  import { type Component, untrack } from 'svelte'

  import { type MoleculeConfig, setMoleculeContext } from '@molecule/app-svelte'

  let {
    config = {},
    component: Target,
    props,
  }: {
    /** The test's provider config (a test may pass its own i18n provider). */
    config?: MoleculeConfig
    /** The component under test. */
    component: Component<Props>
    /** Its props. */
    props: Props
  } = $props()

  // The context is registered once, at mount, from the test's config.
  untrack(() => setMoleculeContext(config))
</script>

<Target {...props} />
