<!--
  Skeleton: a loading placeholder block with pulse/wave animation and
  optional circle shape; sizes become inline styles.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { SkeletonProps } from '../types.js'

  let {
    width,
    height,
    circle,
    borderRadius,
    animation = 'pulse',
    className,
    style,
    testId,
  }: SkeletonProps = $props()

  const cm = $derived(getClassMap())
  const skeletonClasses = $derived(
    cm.cn(
      cm.skeleton(),
      circle && cm.skeletonCircle,
      animation === 'none' && cm.skeletonNone,
      animation === 'wave' && cm.skeletonWave,
      className,
    ),
  )
  const computedStyle = $derived.by(() => {
    const out: Record<string, string | number | undefined> = {
      ...style,
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: circle
        ? '9999px'
        : typeof borderRadius === 'number'
          ? `${borderRadius}px`
          : borderRadius,
    }
    // If circle, make width and height equal
    if (circle && width && !height) {
      out.height = out.width
    }
    return out
  })
</script>

<div class={skeletonClasses} use:reactStyle={computedStyle} data-testid={testId}></div>
