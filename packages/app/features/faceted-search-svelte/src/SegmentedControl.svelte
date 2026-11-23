<!--
  SegmentedControl: the Svelte counterpart of
  `@molecule/app-faceted-search-react`'s `SegmentedControl` — a pill-shaped
  segmented control whose active option takes the primary fill. Same props,
  same DOM for the same input, and the same `onChange` calls. React keys each
  segment by its option's value, so the `{#each}` block does too.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SegmentedControlProps } from './types.js'

  let { options, value, onChange, className }: SegmentedControlProps = $props()

  const cm = $derived(getClassMap())
</script>

<div role="tablist" class={cm.cn(cm.tabsList({ variant: 'solid-rounded', size: 'sm' }), className)}>
  {#each options as opt (opt.value)}
    <button
      type="button"
      role="tab"
      aria-selected={opt.value === value ? 'true' : 'false'}
      data-state={opt.value === value ? 'active' : 'inactive'}
      data-mol-id={opt.dataMolId}
      onclick={() => onChange(opt.value)}
      class={cm.cn(
        cm.tabsTrigger({ variant: 'solid-rounded', size: 'sm' }),
        cm.fontWeight('semibold'),
        cm.touchTargetCompact,
      )}
    >
      {#if typeof opt.label === 'string'}
        {opt.label}
      {:else}
        {@render opt.label?.()}
      {/if}
    </button>
  {/each}
</div>
