<!--
  Renders one provider component around a Probe, so a test can read what the provider set in
  context.
-->
<script lang="ts" generics="Props extends ProviderProps">
  import type { Component } from 'svelte'

  import type { ProviderProps } from '../../types.js'
  import Probe from './Probe.svelte'

  let {
    provider: Provider,
    props,
    read,
  }: { provider: Component<Props>; props: Props; read: () => string } = $props()
</script>

<Provider {...props}><Probe {read} /></Provider>
