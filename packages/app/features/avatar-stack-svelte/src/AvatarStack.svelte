<!--
  AvatarStack: the Svelte counterpart of `@molecule/app-avatar-stack-react`'s
  `AvatarStack` — a horizontal stack of up to `max` overlapping avatars with a
  trailing "+N" overflow chip. Same props (React names), same DOM for the same
  input. The overlap is an inline negative left margin because the ClassMap
  spacing scale is non-negative.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { AvatarStackProps } from './types.js'

  let { people, max = 4, size = 'sm', className }: AvatarStackProps = $props()

  const cm = $derived(getClassMap())
  const visible = $derived(people.slice(0, max))
  const overflow = $derived(Math.max(0, people.length - visible.length))

  /** Negative left margin pulling each avatar over its predecessor (`-0.5rem`). */
  const OVERLAP_MARGIN = 'margin-left: -0.5rem'
</script>

<div class={cm.cn(cm.flex({ align: 'center' }), className)}>
  {#each visible as person, index (index)}
    <span style={index === 0 ? undefined : OVERLAP_MARGIN}>
      <Avatar src={person.src} alt={person.alt ?? person.name} name={person.name} {size} />
    </span>
  {/each}
  {#if overflow > 0}
    <span
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.textSize('xs'),
        cm.fontWeight('medium'),
      )}
      style={OVERLAP_MARGIN}
      aria-label={`+${overflow} more`}>+{overflow}</span
    >
  {/if}
</div>
