<!--
  SubscriptionPlanCard: the Svelte counterpart of
  `@molecule/app-subscription-plan-card-react`'s `SubscriptionPlanCard` —
  header (badge + name + description), price + interval, feature checklist and
  a primary CTA (button or link). Same props, same DOM for the same input; the
  node-valued props are snippets (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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

  // React's `badge ?? t(…)`: an empty badge is a provided (blank) badge.
  const badgeProvided = $derived(badge !== undefined && badge !== null)
  // React's `(badge || recommended)`.
  const showBadge = $derived(Boolean(badge) || Boolean(recommended))
  // React's `description && <p>` and `interval && <span>` truthiness.
  const showDescription = $derived(
    description !== undefined && description !== null && Boolean(description),
  )
  const showInterval = $derived(interval !== undefined && interval !== null && Boolean(interval))
  // React's `{ctaLabel && cta}` — an empty label hides the CTA.
  const showCta = $derived(ctaLabel !== undefined && ctaLabel !== null && Boolean(ctaLabel))
</script>

<Card
  {className}
  style={recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined}
>
  <div class={cm.stack(4)}>
    <header class={cm.stack(1)}>
      {#if showBadge}
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {#if badgeProvided}
            {#if typeof badge === 'function'}{@render badge?.()}{:else}{badge}{/if}
          {:else}
            {t('plan.recommended', {}, { defaultValue: 'Recommended' })}
          {/if}
        </span>
      {/if}
      <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
      </h3>
      {#if showDescription}
        <p class={cm.textSize('sm')}>
          {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
        </p>
      {/if}
    </header>
    <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
      <span class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
        {#if typeof price === 'function'}{@render price?.()}{:else}{price}{/if}
      </span>
      {#if showInterval}
        <span class={cm.textSize('sm')}>
          {#if typeof interval === 'function'}{@render interval?.()}{:else}{interval}{/if}
        </span>
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
        <a href={ctaHref}>
          <Button variant="solid" color={recommended ? 'primary' : 'secondary'}>
            {#if typeof ctaLabel === 'function'}{@render ctaLabel?.()}{:else}{ctaLabel}{/if}
          </Button>
        </a>
      {:else}
        <Button variant="solid" color={recommended ? 'primary' : 'secondary'} onClick={onCta}>
          {#if typeof ctaLabel === 'function'}{@render ctaLabel?.()}{:else}{ctaLabel}{/if}
        </Button>
      {/if}
    {/if}
  </div>
</Card>
