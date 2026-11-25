<!--
  Test host for the FloatingActionButton suite: installs the molecule context (a router, which a
  link to an app path needs), then renders the button with its typed props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setMoleculeContext } from '@molecule/app-svelte'

  import FloatingActionButton from '../FloatingActionButton.svelte'
  import type { FloatingActionButtonProps } from '../types.js'

  let {
    config,
    props: buttonProps,
  }: {
    config: Parameters<typeof setMoleculeContext>[0]
    props: FloatingActionButtonProps
  } = $props()

  untrack(() => setMoleculeContext(config))
</script>

<FloatingActionButton {...buttonProps} />
