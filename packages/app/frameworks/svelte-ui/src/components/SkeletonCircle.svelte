<!--
  Skeleton circle: an avatar-shaped skeleton placeholder.
-->
<script lang="ts">
  import type { SkeletonCircleProps } from '../types.js'
  import Skeleton from './Skeleton.svelte'

  let { size = 40, className }: SkeletonCircleProps = $props()
</script>

<Skeleton circle width={size} height={size} {className} />
