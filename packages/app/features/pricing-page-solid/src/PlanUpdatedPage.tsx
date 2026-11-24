/**
 * Solid post-checkout success page: the plan-updated heading and its optional
 * CTA.
 *
 * Solid counterpart of `@molecule/app-pricing-page-react`'s `PlanUpdatedPage`
 * — the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { PlanUpdatedPageProps } from './types.js'

/**
 * Post-checkout success page. Rendered after Stripe redirects the user
 * back from Checkout (the standard `success_url` route in mlcl
 * flagship apps). All copy is i18n-driven so apps can localise the
 * heading without overriding the component.
 *
 * @param props - Component props (see `PlanUpdatedPageProps`).
 * @returns The rendered success page.
 */
export const PlanUpdatedPage: Component<PlanUpdatedPageProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section class={props.className} data-mol-id="plan-updated-page">
      <header class={cm.cardHeader}>
        <h1 class={cm.cardTitle}>
          {props.planName
            ? t(
                'pricingPage.planUpdated.headingNamed',
                { planName: props.planName },
                { defaultValue: "You're now on the {{planName}} plan" },
              )
            : t('pricingPage.planUpdated.heading', undefined, {
                defaultValue: 'Your plan has been updated',
              })}
        </h1>
        <p class={cm.cardDescription}>
          {t('pricingPage.planUpdated.body', undefined, {
            defaultValue:
              'Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you.',
          })}
        </p>
      </header>
      <ResolveNode node={props.ctaLabel}>
        {(ctaLabel, hasCtaLabel) => (
          <Show when={hasCtaLabel()}>
            <footer class={cm.cardFooter}>
              <Show
                when={props.ctaHref}
                fallback={
                  <button
                    type="button"
                    class={cm.button({ variant: 'solid', size: 'md' })}
                    onClick={(event: MouseEvent) => props.onCta?.(event)}
                    data-mol-id="plan-updated-cta"
                  >
                    {ctaLabel()}
                  </button>
                }
              >
                <a
                  href={props.ctaHref}
                  class={cm.button({ variant: 'solid', size: 'md' })}
                  data-mol-id="plan-updated-cta"
                >
                  {ctaLabel()}
                </a>
              </Show>
            </footer>
          </Show>
        )}
      </ResolveNode>
    </section>
  )
}
