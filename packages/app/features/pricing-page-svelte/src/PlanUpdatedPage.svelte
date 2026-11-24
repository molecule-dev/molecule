<!--
  PlanUpdatedPage: the Svelte counterpart of `@molecule/app-pricing-page-react`'s
  `PlanUpdatedPage` — the post-checkout success page. Same props (React
  names), same DOM for the same input; the `ctaLabel` render node is a
  snippet (or a plain string).
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { PlanUpdatedPageProps } from './types.js'

  let { planName, ctaLabel, onCta, ctaHref, className }: PlanUpdatedPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's `ctaLabel ? <footer>…</footer> : null`: a label snippet that renders nothing (an empty
  // list) drops the whole CTA. `ContentOrElse` reads what the label renders; `PresentWhileContent`
  // takes the footer out while it renders nothing.
  let ctaLabelRenders = $state<boolean>()
  const ctaPresent = $derived(Boolean(ctaLabel) && ctaLabelRenders !== false)
</script>

<section class={className} data-mol-id="plan-updated-page">
  <header class={cm.cardHeader}>
    <h1 class={cm.cardTitle}>
      {#if planName}
        {t(
          'pricingPage.planUpdated.headingNamed',
          { planName },
          { defaultValue: "You're now on the {{planName}} plan" },
        )}
      {:else}
        {t('pricingPage.planUpdated.heading', undefined, {
          defaultValue: 'Your plan has been updated',
        })}
      {/if}
    </h1>
    <p class={cm.cardDescription}>
      {t('pricingPage.planUpdated.body', undefined, {
        defaultValue:
          'Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you.',
      })}
    </p>
  </header>
  {#if ctaLabel}
    <PresentWhileContent tag="footer" class={cm.cardFooter} present={ctaPresent}
      >{#if ctaHref}<a
          href={ctaHref}
          class={cm.button({ variant: 'solid', size: 'md' })}
          data-mol-id="plan-updated-cta"
          ><ContentOrElse bind:present={ctaLabelRenders}
            >{#if typeof ctaLabel === 'string'}{ctaLabel}{:else}{@render ctaLabel?.()}{/if}</ContentOrElse
          ></a
        >{:else}<button
          type="button"
          class={cm.button({ variant: 'solid', size: 'md' })}
          onclick={(event) => onCta?.(event)}
          data-mol-id="plan-updated-cta"
          ><ContentOrElse bind:present={ctaLabelRenders}
            >{#if typeof ctaLabel === 'string'}{ctaLabel}{:else}{@render ctaLabel?.()}{/if}</ContentOrElse
          ></button
        >{/if}</PresentWhileContent
    >
  {/if}
</section>
