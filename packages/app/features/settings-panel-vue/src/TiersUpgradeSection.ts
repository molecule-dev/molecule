/**
 * Vue billing section with the full multi-tier upgrade flow.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `TiersUpgradeSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref,
  ref,
  type VNodeChild,
} from 'vue'

import { serverErrorMessage } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-vue'
import { openUrl } from '@molecule/app-utilities'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import type { TiersUpgradeSectionProps } from './types.js'

/** One price line of a tier, as the section renders it. */
export interface TierPrice {
  stripePriceId?: string
  interval: string
  priceLabel: string
}

/** One upgrade tier with its prices. */
export interface Tier {
  planKey: string
  name: string
  prices: TierPrice[]
}

/**
 * Billing section with full multi-tier upgrade flow.
 *
 * Replaces the simpler `<BillingSection>` for apps backed by
 * `@molecule/api-payments-stripe` + `@molecule/api-resource-payment`
 * — loads the user's current plan from `/api/billing/status`,
 * loads available tiers from `/api/billing/tiers`, and renders an
 * Upgrade modal with a Subscribe button per tier price. Subscribe
 * POSTs to `/api/billing/checkout` and redirects to the Stripe
 * checkout URL; paid users see a Cancel button that POSTs to
 * `/api/billing/cancel`. A refused request shows the server's message.
 *
 * @returns The multi-tier billing section component.
 */
export const TiersUpgradeSection = defineComponent({
  name: 'TiersUpgradeSection',
  props: {
    /**
     * How the page leaves for the checkout URL the server returns. Defaults
     * to a full-page navigation (`openUrl`, which refuses anything but
     * http(s)); pass an in-app browser opener on native.
     */
    redirectToCheckout: {
      type: Function as PropType<TiersUpgradeSectionProps['redirectToCheckout']>,
      required: false,
      default: openUrl,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const http = useHttpClient()

    const plan: Ref<string> = ref('Free')
    const planKey: Ref<string> = ref('free')
    const tiers: Ref<Tier[]> = ref([])
    const showUpgrade: Ref<boolean> = ref(false)
    const upgradeLoading: Ref<string | null> = ref(null)
    const upgradeError: Ref<string> = ref('')

    let cancelled = false
    onMounted(() => {
      void Promise.all([
        // Each fetch resolves null on failure; the .then handler then keeps the
        // defaults ('Free', empty tier list) instead of throwing.
        http
          .get<{ planKey?: string; name?: string }>('/api/billing/status')
          .catch((_error) => null),
        http
          .get<{
            data?: Array<{
              key: string
              name: string
              prices: Array<{ stripePriceId: string | null; period: string; price: string }>
            }>
          }>('/api/billing/tiers')
          .catch((_error) => null),
      ])
        .then(([statusRes, tiersRes]) => {
          if (cancelled) return
          const status = statusRes?.data ?? null
          if (status?.name) plan.value = status.name
          if (status?.planKey) planKey.value = status.planKey
          const list = tiersRes?.data?.data ?? []
          if (Array.isArray(list)) {
            tiers.value = list.map((tier) => ({
              planKey: tier.key,
              name: tier.name,
              prices: (tier.prices || []).map((p) => ({
                stripePriceId: p.stripePriceId ?? undefined,
                interval: p.period,
                priceLabel: p.price,
              })),
            }))
          }
        })
        .catch((_error) => {
          // Fetch failures already resolve to null above; this only guards the
          // mapping, keeping the section on its defaults rather than throwing.
        })
    })
    onUnmounted(() => {
      cancelled = true
    })

    /**
     * Starts checkout for one price and leaves through the checkout URL;
     * a refusal shows the server's message.
     *
     * @param stripePriceId - The Stripe price to subscribe to.
     */
    const handleStartCheckout = async (stripePriceId: string): Promise<void> => {
      upgradeError.value = ''
      upgradeLoading.value = stripePriceId
      try {
        const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
          '/api/billing/checkout',
          { priceId: stripePriceId },
        )
        const data = res.data
        if (data?.checkoutUrl) {
          props.redirectToCheckout(data.checkoutUrl)
          return
        }
        if (data?.updated) {
          showUpgrade.value = false
          return
        }
        upgradeError.value = t('settings.billing.checkoutFailed', undefined, {
          defaultValue: 'Could not start checkout.',
        })
      } catch (err) {
        upgradeError.value =
          serverErrorMessage(err) ??
          t('settings.billing.checkoutFailed', undefined, {
            defaultValue: 'Could not start checkout.',
          })
      } finally {
        upgradeLoading.value = null
      }
    }

    /** Cancels the subscription back to the free plan. */
    const handleCancelSubscription = async (): Promise<void> => {
      upgradeError.value = ''
      try {
        await http.post('/api/billing/cancel', {})
        plan.value = 'Free'
        planKey.value = 'free'
      } catch (err) {
        upgradeError.value =
          serverErrorMessage(err) ??
          t('settings.billing.cancelFailed', undefined, {
            defaultValue: 'Could not cancel.',
          })
      }
    }

    return (): VNodeChild => [
      h('section', [
        h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
          t('settings.billing', undefined, { defaultValue: 'Billing' }),
        ]),
        h(Flex, { align: 'center', justify: 'between' }, () => [
          h('span', { class: cm.textSize('sm') }, [
            t('settings.plan', undefined, { defaultValue: 'Plan: ' }),
            h('strong', [plan.value]),
          ]),
          planKey.value === 'free'
            ? h(
                Button,
                { variant: 'outline', size: 'sm', onClick: () => (showUpgrade.value = true) },
                () => [t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })],
              )
            : h(ConfirmButton, {
                variant: 'outline',
                size: 'sm',
                label: t('settings.billing.cancel', undefined, { defaultValue: 'Cancel' }),
                confirmLabel: t('settings.billing.cancelConfirm', undefined, {
                  defaultValue: 'Cancel your subscription?',
                }),
                onConfirm: handleCancelSubscription,
                'data-mol-id': 'billing-cancel-subscription',
              }),
        ]),
      ]),
      h(
        Modal,
        {
          open: showUpgrade.value,
          onClose: () => (showUpgrade.value = false),
          title: t('settings.billing.upgradeTitle', undefined, {
            defaultValue: 'Upgrade your plan',
          }),
        },
        {
          default: () => [
            upgradeError.value
              ? h(Alert, { status: 'error', className: cm.sp('mb', 4) }, () => [upgradeError.value])
              : null,
            tiers.value.length === 0
              ? h('p', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [
                  t('settings.billing.noTiers', undefined, {
                    defaultValue: 'No paid plans configured.',
                  }),
                ])
              : h(
                  'ul',
                  { class: cm.stack(3) },
                  tiers.value
                    .filter((tier) => tier.planKey !== 'free')
                    .flatMap((tier) =>
                      tier.prices.filter((p) => p.stripePriceId).map((price) => ({ tier, price })),
                    )
                    .map(({ tier, price }) =>
                      h(
                        'li',
                        { key: `${tier.planKey}-${price.stripePriceId}`, class: cm.sp('p', 4) },
                        [
                          h(Flex, { align: 'center', justify: 'between' }, () => [
                            h('div', [
                              h('p', { class: cm.fontWeight('semibold') }, [
                                `${tier.name} (${price.interval})`,
                              ]),
                              h('p', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, [
                                price.priceLabel,
                              ]),
                            ]),
                            h(
                              Button,
                              {
                                size: 'sm',
                                loading: upgradeLoading.value === price.stripePriceId,
                                onClick: () => {
                                  if (price.stripePriceId)
                                    void handleStartCheckout(price.stripePriceId)
                                },
                              },
                              () => [
                                t('settings.billing.subscribe', undefined, {
                                  defaultValue: 'Subscribe',
                                }),
                              ],
                            ),
                          ]),
                        ],
                      ),
                    ),
                ),
          ],
        },
      ),
    ]
  },
})
