/**
 * Vue post-checkout success page: the plan-updated heading and its optional
 * CTA.
 *
 * Vue counterpart of `@molecule/app-pricing-page-react`'s `PlanUpdatedPage` —
 * the same props (React names), the same DOM for the same input. The
 * node-valued `ctaLabel` prop arrives as a prop AND a same-named slot; both
 * work.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { PlanUpdatedPageProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Post-checkout success page. Rendered after Stripe redirects the user
 * back from Checkout (the standard `success_url` route in mlcl
 * flagship apps). All copy is i18n-driven so apps can localise the
 * heading without overriding the component.
 *
 * @param props - Component props (see `PlanUpdatedPageProps`).
 * @returns The rendered success page.
 */
export const PlanUpdatedPage = defineComponent({
  name: 'PlanUpdatedPage',
  props: {
    planName: String,
    ctaLabel: null,
    onCta: {
      type: Function as PropType<PlanUpdatedPageProps['onCta']>,
      required: false,
    },
    ctaHref: String,
    className: String,
  },
  setup(props: PlanUpdatedPageProps, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const heading = props.planName
        ? t(
            'pricingPage.planUpdated.headingNamed',
            { planName: props.planName },
            { defaultValue: "You're now on the {{planName}} plan" },
          )
        : t('pricingPage.planUpdated.heading', undefined, {
            defaultValue: 'Your plan has been updated',
          })

      const ctaLabel = slotOrProp(slots.ctaLabel, props.ctaLabel)
      const cta: VNodeChild | null =
        toChildArray(ctaLabel).length > 0
          ? props.ctaHref
            ? h(
                'a',
                {
                  href: props.ctaHref,
                  class: cm.button({ variant: 'solid', size: 'md' }),
                  'data-mol-id': 'plan-updated-cta',
                },
                ctaLabel,
              )
            : h(
                'button',
                {
                  type: 'button',
                  class: cm.button({ variant: 'solid', size: 'md' }),
                  onClick: (event: unknown) => props.onCta?.(event),
                  'data-mol-id': 'plan-updated-cta',
                },
                ctaLabel,
              )
          : null

      return h('section', { class: props.className, 'data-mol-id': 'plan-updated-page' }, [
        h('header', { class: cm.cardHeader }, [
          h('h1', { class: cm.cardTitle }, heading),
          h(
            'p',
            { class: cm.cardDescription },
            t('pricingPage.planUpdated.body', undefined, {
              defaultValue:
                'Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you.',
            }),
          ),
        ]),
        cta ? h('footer', { class: cm.cardFooter }, [cta]) : null,
      ])
    }
  },
})
