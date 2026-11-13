<!--
  Skeleton text lines: a stack of skeleton bars, the last one 60% wide.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SkeletonTextProps } from '../types.js'
  import Skeleton from './Skeleton.svelte'

  let { lines = 3, className }: SkeletonTextProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.skeletonTextContainer, className)}>
  {#each Array.from({ length: lines }) as _, i (i)}
    <Skeleton height={16} width={i === lines - 1 ? '60%' : '100%'} />
  {/each}
</div>
