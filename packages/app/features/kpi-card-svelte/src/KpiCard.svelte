<!--
  KpiCard: the Svelte counterpart of `@molecule/app-kpi-card-react`'s `KpiCard` —
  a single dashboard metric under a label, with optional subtitle, icon, trend
  and action. Same props (React names), same DOM for the same input. Node-valued
  props are snippets, or plain strings.
-->
<script lang="ts">
  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { KpiCardProps } from './types.js'

  let {
    title,
    value,
    subtitle,
    icon,
    trend,
    action,
    accentSide = 'none',
    accentColor,
    upperLabel = false,
    emphasizeValue = false,
    hoverLift = false,
    className,
    dataMolId,
  }: KpiCardProps = $props()

  const cm = $derived(getClassMap())
  const accent = $derived(accentColor ?? cm.kpiCardAccentColor)
  const accentClass = $derived(
    accentSide === 'left'
      ? cm.cn(cm.kpiCardAccentLeft, accent)
      : accentSide === 'top'
        ? cm.cn(cm.kpiCardAccentTop, accent)
        : '',
  )
  const liftClass = $derived(hoverLift ? cm.kpiCardHoverLift : '')
  const cardClass = $derived(cm.cn(accentClass, liftClass, className))
  const stackClass = $derived(cm.stack(3))
  const headerClass = $derived(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))
  const innerClass = $derived(cm.flex({ align: 'center', gap: 'sm' }))
  const titleClass = $derived(
    upperLabel
      ? cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.kpiCardTitleUppercase)
      : cm.cn(cm.textSize('sm'), cm.fontWeight('medium')),
  )
  const valueClass = $derived(
    cm.cn(cm.textSize('3xl'), emphasizeValue ? cm.fontWeight('extrabold') : cm.fontWeight('bold')),
  )
  const subtitleClass = $derived(cm.textSize('sm'))
</script>

<Card className={cardClass} data-mol-id={dataMolId}>
  <div class={stackClass}>
    <div class={headerClass}>
      <div class={innerClass}>
        {#if typeof icon === 'function'}{@render icon?.()}{:else if icon}{icon}{/if}
        <span class={titleClass}>
          {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
        </span>
      </div>
      {#if typeof action === 'function'}{@render action?.()}{:else if action}{action}{/if}
    </div>
    <div class={valueClass}>
      {#if typeof value === 'function'}{@render value?.()}{:else}{value}{/if}
    </div>
    <PresentWhileContent class={innerClass}
      >{#if typeof trend === 'function'}{@render trend?.()}{:else if trend}{trend}{/if}{#if subtitle}<PresentWhileContent
          tag="span"
          class={subtitleClass}
          >{#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}</PresentWhileContent
        >{/if}</PresentWhileContent
    >
  </div>
</Card>
