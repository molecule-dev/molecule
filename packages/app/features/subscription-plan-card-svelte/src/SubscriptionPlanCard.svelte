<!--
  SubscriptionPlanCard: the Svelte counterpart of
  `@molecule/app-subscription-plan-card-react`'s `SubscriptionPlanCard` —
  header (badge + name + description), price + interval, feature checklist and
  a primary CTA (button or link). Same props, same DOM for the same input; the
  node-valued props are snippets (or plain strings).
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { SubscriptionPlanCardProps } from './types.js'

  let {
    name,
    description,
    price,
    interval,
    features,
    ctaLabel,
    onCta,
    ctaHref,
    recommended,
    badge,
    className,
  }: SubscriptionPlanCardProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // React's `(badge || recommended)`.
  const showBadge = $derived(Boolean(badge) || Boolean(recommended))
  // React's `description && <p>` and `interval && <span>` truthiness.
  const showDescription = $derived(
    description !== undefined && description !== null && Boolean(description),
  )
  const showInterval = $derived(interval !== undefined && interval !== null && Boolean(interval))
  // React's `{ctaLabel && cta}` — an empty label hides the CTA.
  const showCta = $derived(ctaLabel !== undefined && ctaLabel !== null && Boolean(ctaLabel))

  // React's `slot(badge) ?? t(… Recommend…)` and `slot(ctaLabel) && cta`: a node that renders
  // nothing is absent, so the badge falls back to "Recommended" and the CTA link leaves the page.
  let badgeRenders = $state<boolean>()
  let ctaLabelRenders = $state<boolean>()
  const badgePresent = $derived(Boolean(badge) && badgeRenders !== false)
  const ctaLabelPresent = $derived(Boolean(ctaLabel) && ctaLabelRenders !== false)
</script>

<Card
  {className}
  style={recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined}
>
  <div class={cm.stack(4)}>
    <header class={cm.stack(1)}>
      {#if showBadge}
        <PresentWhileContent
          tag="span"
          present={badgePresent || Boolean(recommended)}
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          ><ContentOrElse bind:present={badgeRenders}
            >{#if badge}{#if typeof badge === 'function'}{@render badge?.()}{:else}{badge}{/if}{/if}</ContentOrElse
          >{#if !badgePresent}{t(
              'plan.recommended',
              {},
              { defaultValue: 'Recommended' },
            )}{/if}</PresentWhileContent
        >
      {/if}
      <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
      </h3>
      {#if showDescription}
        <PresentWhileContent tag="p" class={cm.textSize('sm')}>
          {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
        </PresentWhileContent>
      {/if}
    </header>
    <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
      <span class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
        {#if typeof price === 'function'}{@render price?.()}{:else}{price}{/if}
      </span>
      {#if showInterval}
        <PresentWhileContent tag="span" class={cm.textSize('sm')}>
          {#if typeof interval === 'function'}{@render interval?.()}{:else}{interval}{/if}
        </PresentWhileContent>
      {/if}
    </div>
    <ul class={cm.stack(2)}>
      {#each features as feature, i (i)}
        <li class={cm.flex({ align: 'start', gap: 'sm' })}>
          <span aria-hidden="true">✓</span>
          <span class={cm.textSize('sm')}>
            {#if typeof feature === 'function'}{@render feature?.()}{:else}{feature}{/if}
          </span>
        </li>
      {/each}
    </ul>
    {#if showCta}
      {#if ctaHref}
        <PresentWhileContent tag="a" href={ctaHref} present={ctaLabelPresent}
          ><Button variant="solid" color={recommended ? 'primary' : 'secondary'}
            ><ContentOrElse bind:present={ctaLabelRenders}
              >{#if typeof ctaLabel === 'function'}{@render ctaLabel?.()}{:else}{ctaLabel}{/if}</ContentOrElse
            ></Button
          ></PresentWhileContent
        >
      {:else}
        <Button variant="solid" color={recommended ? 'primary' : 'secondary'} onClick={onCta}>
          {#if typeof ctaLabel === 'function'}{@render ctaLabel?.()}{:else}{ctaLabel}{/if}
        </Button>
      {/if}
    {/if}
  </div>
</Card>
