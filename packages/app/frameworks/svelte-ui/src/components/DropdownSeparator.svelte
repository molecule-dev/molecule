<!--
  DropdownSeparator: dividing rule inside a dropdown menu.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { DropdownSeparatorProps } from '../types.js'

  let { ref = $bindable(null), className }: DropdownSeparatorProps = $props()

  const cm = $derived(getClassMap())
</script>

<div bind:this={ref} class={cm.cn(cm.dropdownSeparator, className)} role="separator"></div>
