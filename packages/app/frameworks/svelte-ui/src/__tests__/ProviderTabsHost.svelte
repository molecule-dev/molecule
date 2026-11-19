<!--
  Test host for the Tabs variant/size test: a re-render with different
  variant/size props must produce different class strings on the list, the
  trigger and the panel.
-->
<script lang="ts">
  import Tabs from '../components/Tabs.svelte'
  import type { TabItem } from '../types.js'

  const items: TabItem[] = [{ value: 'one', label: 'First', content: 'first body' }]

  let big = $state(true)
</script>

<button type="button" data-toggle onclick={() => (big = !big)}>toggle</button>
<Tabs
  {items}
  defaultValue="one"
  variant={big ? 'line' : 'solid-rounded'}
  size={big ? 'lg' : 'sm'}
/>
