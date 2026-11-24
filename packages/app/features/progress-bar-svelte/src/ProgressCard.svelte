<!--
  ProgressCard: the Svelte counterpart of `@molecule/app-progress-bar-react`'s
  `ProgressCard` — a Card-wrapped progress display with title, optional icon
  and description, the bar, and an optional extras slot below. Same props,
  same DOM. Node props (`title`, `description`, `icon`, `valueLabel`,
  `children`) are snippets, or plain strings.

  The bar is named by the title (`aria-labelledby`) and, when a description
  renders, described by it (`aria-describedby`).
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '@molecule/app-svelte'
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

  // Per-instance stable ids (React's `useId()` — Svelte allows one
  // `$props.id()` per component, so the description's id is derived from it,
  // never from data): the title names the bar, the description describes it.
  const baseId = $props.id()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-description`

  const cm = $derived(getClassMap())

  // React's `slot(description)`: a description that renders nothing is absent, so the bar carries no
  // `aria-describedby` and no paragraph. `ContentOrElse` reads what the snippet renders and
  // `PresentWhileContent present={…}` takes the paragraph out.
  let descriptionRenders = $state<boolean>()
  let valueLabelRenders = $state<boolean>()
  const descriptionPresent = $derived(Boolean(description) && descriptionRenders !== false)
  const valueLabelPresent = $derived(Boolean(valueLabel) && valueLabelRenders !== false)
</script>

<Card {className}>
  <div class={cm.stack(3)}>
    <div class={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {#if icon}
          {#if typeof icon === 'function'}{@render icon?.()}{:else}{icon}{/if}
        {/if}
        <div>
          <h3 id={titleId} class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
          </h3>
          {#if description}
            <PresentWhileContent
              tag="p"
              present={descriptionPresent}
              id={descriptionId}
              class={cm.textSize('sm')}
            >
              <ContentOrElse bind:present={descriptionRenders}
                >{#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}</ContentOrElse
              >
            </PresentWhileContent>
          {/if}
        </div>
      </div>
      {#if valueLabel}
        <PresentWhileContent
          tag="span"
          present={valueLabelPresent}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >
          <ContentOrElse bind:present={valueLabelRenders}
            >{#if typeof valueLabel === 'function'}{@render valueLabel?.()}{:else}{valueLabel}{/if}</ContentOrElse
          >
        </PresentWhileContent>
      {/if}
    </div>
    <ProgressBar
      {value}
      {max}
      {color}
      labelledBy={titleId}
      describedBy={descriptionPresent ? descriptionId : undefined}
    />
    {#if children}{@render children?.()}{/if}
  </div>
</Card>
