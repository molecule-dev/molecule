<!--
  ProgressCard: the Svelte counterpart of `@molecule/app-progress-bar-react`'s
  `ProgressCard` — a Card-wrapped progress display with title, optional icon
  and description, the bar, and an optional extras slot below. Same props,
  same DOM. Node props (`title`, `description`, `icon`, `valueLabel`,
  `children`) are snippets, or plain strings.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import ProgressBar from './ProgressBar.svelte'
  import type { ProgressCardProps } from './types.js'

  let {
    title,
    description,
    icon,
    value,
    max = 100,
    valueLabel,
    color = 'primary',
    className,
    children,
  }: ProgressCardProps = $props()

  const cm = $derived(getClassMap())
</script>

<Card {className}>
  <div class={cm.stack(3)}>
    <div class={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {#if icon}
          {#if typeof icon === 'function'}{@render icon()}{:else}{icon}{/if}
        {/if}
        <div>
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
          </h3>
          {#if description}
            <p class={cm.textSize('sm')}>
              {#if typeof description === 'function'}{@render description()}{:else}{description}{/if}
            </p>
          {/if}
        </div>
      </div>
      {#if valueLabel}
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {#if typeof valueLabel === 'function'}{@render valueLabel()}{:else}{valueLabel}{/if}
        </span>
      {/if}
    </div>
    <ProgressBar {value} {max} {color} />
    {#if children}{@render children()}{/if}
  </div>
</Card>
