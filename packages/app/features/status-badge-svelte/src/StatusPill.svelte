<!--
  StatusPill: the Svelte counterpart of `@molecule/app-status-badge-react`'s
  `StatusPill` — a rounded pill with an optional leading colored dot. The pill
  has no background surface of its own; only the dot carries color. Same props
  (React names) and same DOM for the same input; `children` is a snippet.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { StatusKind, StatusPillProps } from './types.js'

  let { kind = 'neutral', children, dot = true, className }: StatusPillProps = $props()

  const DOT_COLOR: Record<StatusKind, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    neutral: 'bg-outline',
  }

  const cm = $derived(getClassMap())
</script>

<span
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'xs' }),
    cm.sp('px', 3),
    cm.sp('py', 1),
    cm.roundedFull,
    cm.textSize('xs'),
    cm.fontWeight('medium'),
    className,
  )}
>
  {#if dot}<span class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, DOT_COLOR[kind])} aria-hidden="true"
    ></span>{/if}
  {@render children()}
</span>
