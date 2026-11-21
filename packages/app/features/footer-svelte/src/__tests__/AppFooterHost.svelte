<!--
  Test host for `AppFooter`: provides the router + i18n Molecule context the
  footer's links, translation and version reads need, then renders the
  component with its own props. The conformance kit's host types its
  `component` prop as `Component<Record<string, unknown>>`, which
  `strictFunctionTypes` will not accept for a component with declared props;
  this host keeps the props type flowing into each mount instead.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'

  import { type MoleculeConfig, setMoleculeContext } from '@molecule/app-svelte'

  import AppFooter from '../AppFooter.svelte'

  let { config, props }: { config: MoleculeConfig; props: ComponentProps<typeof AppFooter> } =
    $props()

  setMoleculeContext(config)
</script>

<AppFooter {...props} />
