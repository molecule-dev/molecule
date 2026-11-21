<!--
  Test host for `AnimationCanvas`: provides the i18n Molecule context the
  canvas's translated label reads, then renders the component with its own
  props. The conformance kit's host types its `component` prop as
  `Component<Record<string, unknown>>`, which `strictFunctionTypes` will not
  accept for a component with declared props; this host keeps the props type
  flowing into each mount instead.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte'

  import { type MoleculeConfig, setMoleculeContext } from '@molecule/app-svelte'

  import AnimationCanvas from '../AnimationCanvas.svelte'

  let { config, props }: { config: MoleculeConfig; props: ComponentProps<typeof AnimationCanvas> } =
    $props()

  setMoleculeContext(config)
</script>

<AnimationCanvas {...props} />
