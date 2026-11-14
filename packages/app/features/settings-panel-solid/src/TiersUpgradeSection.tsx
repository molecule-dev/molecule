/**
 * The multi-tier billing section.
 *
 * @module
 */

import { createSignal, For, type JSX, onCleanup, Show } from 'solid-js'

import { serverErrorMessage } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-solid'
import { getClassMap, molIdProps } from '@molecule/app-ui'
import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-solid'
import { openUrl } from '@molecule/app-utilities'

import type { TiersUpgradeSectionProps } from './types.js'

interface TierPrice {
  stripePriceId?: string
  interval: string
  priceLabel: string
}

interface Tier {
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
 * @param props - Component props.
 * @returns The billing section.
 */
export function TiersUpgradeSection(props: TiersUpgradeSectionProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [plan, setPlan] = createSignal<string>('Free')
  const [planKey, setPlanKey] = createSignal<string>('free')
  const [tiers, setTiers] = createSignal<Tier[]>([])
  const [showUpgrade, setShowUpgrade] = createSignal(false)
  const [upgradeLoading, setUpgradeLoading] = createSignal<string | null>(null)
  const [upgradeError, setUpgradeError] = createSignal('')

  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })
  void Promise.all([
    // Each fetch resolves null on failure; the .then handler then keeps the
    // defaults ('Free', empty tier list) instead of throwing.
    http.get<{ planKey?: string; name?: string }>('/api/billing/status').catch((_error) => null),
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
      if (status?.name) setPlan(status.name)
      if (status?.planKey) setPlanKey(status.planKey)
      const list = tiersRes?.data?.data ?? []
      if (Array.isArray(list)) {
        setTiers(
          list.map((tier) => ({
            planKey: tier.key,
            name: tier.name,
            prices: (tier.prices || []).map((p) => ({
              stripePriceId: p.stripePriceId ?? undefined,
              interval: p.period,
              priceLabel: p.price,
            })),
          })),
        )
      }
    })
    .catch((_error) => {
      // Fetch failures already resolve to null above; this only guards the
      // mapping, keeping the section on its defaults rather than throwing.
    })

  // The free tiers and price-less tiers render nothing, so flatten to the
  // subscribe buttons' rows up front (the same list React's map builds).
  const priceRows = (): Array<{ tier: Tier; price: TierPrice }> =>
    tiers()
      .filter((tier) => tier.planKey !== 'free')
      .flatMap((tier) =>
        tier.prices.filter((p) => p.stripePriceId).map((price) => ({ tier, price })),
      )

  const handleStartCheckout = async (stripePriceId: string): Promise<void> => {
    setUpgradeError('')
    setUpgradeLoading(stripePriceId)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId: stripePriceId },
      )
      const data = res.data
      if (data?.checkoutUrl) {
        const leave = props.redirectToCheckout ?? openUrl
        leave(data.checkoutUrl)
        return
      }
      if (data?.updated) {
        setShowUpgrade(false)
        return
      }
      setUpgradeError(
        t('settings.billing.checkoutFailed', undefined, {
          defaultValue: 'Could not start checkout.',
        }),
      )
    } catch (err) {
      setUpgradeError(
        serverErrorMessage(err) ??
          t('settings.billing.checkoutFailed', undefined, {
            defaultValue: 'Could not start checkout.',
          }),
      )
    } finally {
      setUpgradeLoading(null)
    }
  }

  const handleCancelSubscription = async (): Promise<void> => {
    setUpgradeError('')
    try {
      await http.post('/api/billing/cancel', {})
      setPlan('Free')
      setPlanKey('free')
    } catch (err) {
      setUpgradeError(
        serverErrorMessage(err) ??
          t('settings.billing.cancelFailed', undefined, {
            defaultValue: 'Could not cancel.',
          }),
      )
    }
  }

  return (
    <>
      <section>
        <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.billing', undefined, { defaultValue: 'Billing' })}
        </h3>
        <Flex align="center" justify="between">
          <span class={cm.textSize('sm')}>
            {t('settings.plan', undefined, { defaultValue: 'Plan: ' })}
            <strong>{plan()}</strong>
          </span>
          <Show
            when={planKey() === 'free'}
            fallback={
              <ConfirmButton
                variant="outline"
                size="sm"
                label={t('settings.billing.cancel', undefined, { defaultValue: 'Cancel' })}
                confirmLabel={t('settings.billing.cancelConfirm', undefined, {
                  defaultValue: 'Cancel your subscription?',
                })}
                onConfirm={() => handleCancelSubscription()}
                {...molIdProps('billing-cancel-subscription')}
              />
            }
          >
            <Button variant="outline" size="sm" onClick={() => setShowUpgrade(true)}>
              {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
            </Button>
          </Show>
        </Flex>
      </section>

      <Modal
        open={showUpgrade()}
        onClose={() => setShowUpgrade(false)}
        title={t('settings.billing.upgradeTitle', undefined, {
          defaultValue: 'Upgrade your plan',
        })}
      >
        <Show when={upgradeError()}>
          <Alert status="error" className={cm.sp('mb', 4)}>
            {upgradeError()}
          </Alert>
        </Show>
        <Show
          when={tiers().length > 0}
          fallback={
            <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settings.billing.noTiers', undefined, {
                defaultValue: 'No paid plans configured.',
              })}
            </p>
          }
        >
          <ul class={cm.stack(3)}>
            <For each={priceRows()}>
              {({ tier, price }) => (
                <li class={cm.sp('p', 4)}>
                  <Flex align="center" justify="between">
                    <div>
                      <p class={cm.fontWeight('semibold')}>
                        {tier.name} ({price.interval})
                      </p>
                      <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{price.priceLabel}</p>
                    </div>
                    <Button
                      size="sm"
                      loading={upgradeLoading() === price.stripePriceId}
                      onClick={() => {
                        if (price.stripePriceId) void handleStartCheckout(price.stripePriceId)
                      }}
                    >
                      {t('settings.billing.subscribe', undefined, {
                        defaultValue: 'Subscribe',
                      })}
                    </Button>
                  </Flex>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Modal>
    </>
  )
}
