<!--
  MedicationRow: the Svelte counterpart of
  `@molecule/app-medication-row-react`'s `MedicationRow` — drug name +
  dosage/form, instructions, prescriber, days-of-supply and refills-remaining
  readouts, optional pill-color dot and right-side actions. Same props, same
  ClassMap tokens, same DOM for the same input. Node props (`name`, `dosage`,
  `form`, `instructions`, `prescriber`, `actions`) are snippets, or plain
  strings.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import { reactStyle } from './style.js'
  import type { MedicationRowProps } from './types.js'

  let {
    name,
    dosage,
    form,
    color,
    instructions,
    prescriber,
    supplyDays,
    refills,
    actions,
    className,
  }: MedicationRowProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const prescribedBy = $derived(t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' }))
  const supplyText = $derived(
    t('medication.supplyDays', { days: supplyDays ?? 0 }, { defaultValue: '{{days}} day supply' }),
  )
  const refillsText = $derived(
    t('medication.refills', { refills: refills ?? 0 }, { defaultValue: '{{refills}} refills' }),
  )

  // The prescriber span is in the page while `prescriber` renders something,
  // the label aside — React's `prescriber && <span>Prescribed by {prescriber}</span>`.
  let prescriberPresent = $state<boolean>()
</script>

<Card {className}>
  <div class={cm.flex({ align: 'start', gap: 'md' })}>
    {#if color}
      <span
        aria-hidden="true"
        class={cm.cn(cm.shrink0, cm.roundedFull)}
        use:reactStyle={{ width: '24px', height: '24px', background: color }}
      ></span>
    {/if}
    <div class={cm.cn(cm.flex1, cm.stack(1))}>
      <header class={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
          {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
        </h3>
        {#if dosage}
          <PresentWhileContent tag="span" class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {#if typeof dosage === 'function'}{@render dosage?.()}{:else}{dosage}{/if}
          </PresentWhileContent>
        {/if}
        {#if form}
          <PresentWhileContent tag="span" class={cm.textSize('xs')}>
            {#if typeof form === 'function'}{@render form?.()}{:else}{form}{/if}
          </PresentWhileContent>
        {/if}
      </header>
      {#if instructions}
        <PresentWhileContent tag="p" class={cm.textSize('sm')}>
          {#if typeof instructions === 'function'}{@render instructions?.()}{:else}{instructions}{/if}
        </PresentWhileContent>
      {/if}
      <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        {#if prescriber}
          {#if typeof prescriber === 'function'}
            <PresentWhileContent tag="span" class={cm.textSize('xs')} present={prescriberPresent}
              >{prescribedBy}
              <ContentOrElse bind:present={prescriberPresent}
                >{@render prescriber?.()}</ContentOrElse
              ></PresentWhileContent
            >
          {:else}
            <span class={cm.textSize('xs')}>{prescribedBy} {prescriber}</span>
          {/if}
        {/if}
        {#if supplyDays !== undefined}
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>· {supplyText}</span>
        {/if}
        {#if refills !== undefined}
          <span class={cm.textSize('xs')}>· {refillsText}</span>
        {/if}
      </div>
    </div>
    {#if actions}
      <PresentWhileContent class={cm.shrink0}>{@render actions?.()}</PresentWhileContent>
    {/if}
  </div>
</Card>
