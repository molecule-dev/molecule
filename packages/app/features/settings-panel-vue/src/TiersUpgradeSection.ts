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
 * Upgrade modal with a Subscribe button per price that is for sale (one
 * the server lists with a price id). Upgrade appears only for a free user
 * and only when something is for sale. Subscribe POSTs to
 * `/api/billing/checkout` and redirects to the checkout URL; a paid user
 * (`isFree: false` in the status) sees a Cancel button that POSTs to
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

    const plan: Ref<string | null> = ref(null)
    const planKey: Ref<string | null> = ref(null)
    const isFree: Ref<boolean> = ref(true)
    const tiers: Ref<Tier[]> = ref([])
    const showUpgrade: Ref<boolean> = ref(false)
    const upgradeLoading: Ref<string | null> = ref(null)
    const upgradeError: Ref<string> = ref('')
    const cancelError: Ref<string> = ref('')

    let cancelled = false
    // Only the latest load applies: a reload after cancel supersedes the one before it.
    let loads = 0
    /** Loads the plan and the tiers; failures keep what the section shows. */
    const load = (): void => {
      const seq = ++loads
      void Promise.all([
        // Each fetch resolves null on failure; the .then handler then keeps the
        // defaults (no plan label, nothing for sale) instead of throwing.
        http
          .get<{ planKey?: string; name?: string; isFree?: boolean }>('/api/billing/status')
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
          if (cancelled || seq !== loads) return
          const status = statusRes?.data ?? null
          if (status?.name) plan.value = status.name
          if (status?.planKey) planKey.value = status.planKey
          if (typeof status?.isFree === 'boolean') isFree.value = status.isFree
          const list = tiersRes?.data?.data
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
    }
    onMounted(load)
    onUnmounted(() => {
      cancelled = true
    })

    /**
     * What can be bought: a price the server lists with a price id, on a tier the user is not on.
     *
     * @returns Each purchasable price with its tier.
     */
    const forSale = (): Array<{ tier: Tier; price: TierPrice; priceId: string }> =>
      tiers.value
        .filter((tier) => tier.planKey !== planKey.value)
        .flatMap((tier) =>
          tier.prices.flatMap((price) =>
            price.stripePriceId ? [{ tier, price, priceId: price.stripePriceId }] : [],
          ),
        )

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

    /** Cancels the subscription, then reloads the plan the server now reports. */
    const handleCancelSubscription = async (): Promise<void> => {
      cancelError.value = ''
      try {
        await http.post('/api/billing/cancel', {})
        // The server decides what the plan is now (a provider may cancel at period end).
        load()
      } catch (err) {
        cancelError.value =
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
          // The plan line waits for the server: there is no plan name to guess.
          plan.value
            ? h('span', { class: cm.textSize('sm') }, [
                t('settings.plan', undefined, { defaultValue: 'Plan: ' }),
                h('strong', [plan.value]),
              ])
            : h('span'),
          isFree.value
            ? forSale().length > 0
              ? h(
                  Button,
                  { variant: 'outline', size: 'sm', onClick: () => (showUpgrade.value = true) },
                  () => [t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })],
                )
              : null
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
        cancelError.value
          ? h(Alert, { status: 'error', className: cm.sp('mt', 3) }, () => [cancelError.value])
          : null,
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
            h(
              'ul',
              { class: cm.stack(3) },
              forSale().map(({ tier, price, priceId }) =>
                h('li', { key: `${tier.planKey}-${priceId}`, class: cm.sp('p', 4) }, [
                  h(Flex, { align: 'center', justify: 'between' }, () => [
                    h('div', [
                      h('p', { class: cm.fontWeight('semibold') }, [
                        `${tier.name} (${price.interval})`,
                      ]),
                      h('p', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, [price.priceLabel]),
                    ]),
                    h(
                      Button,
                      {
                        size: 'sm',
                        loading: upgradeLoading.value === priceId,
                        onClick: () => void handleStartCheckout(priceId),
                      },
                      () => [
                        t('settings.billing.subscribe', undefined, {
                          defaultValue: 'Subscribe',
                        }),
                      ],
                    ),
                  ]),
                ]),
              ),
            ),
          ],
        },
      ),
    ]
  },
})
