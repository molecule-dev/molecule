<!--
  DropdownSeparator: dividing rule inside a dropdown menu.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { DropdownSeparatorProps } from '../types.js'

  let { className }: DropdownSeparatorProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.dropdownSeparator, className)} role="separator"></div>
