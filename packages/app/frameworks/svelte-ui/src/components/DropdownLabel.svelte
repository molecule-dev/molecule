<!--
  DropdownLabel: group label inside a dropdown menu.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { DropdownLabelProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  let { children, className }: DropdownLabelProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.dropdownLabel, className)}><ReactNode node={children} /></div>
