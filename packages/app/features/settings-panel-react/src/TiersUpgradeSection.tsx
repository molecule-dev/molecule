import { type JSX, useEffect, useState } from 'react'

import { serverErrorMessage } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-react'
import { openUrl } from '@molecule/app-utilities'

/** One price of a billing tier, mapped from `/api/billing/tiers`. */
export interface TierPrice {
  stripePriceId?: string
  interval: string
  priceLabel: string
}

/** Props for {@link TiersUpgradeSection}. */
export interface TiersUpgradeSectionProps {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to a
   * full-page navigation (`openUrl` from `@molecule/app-utilities`).
   */
  redirectToCheckout?: (checkoutUrl: string) => void
}

/** One paid tier, mapped from `/api/billing/tiers`. */
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
 * @param props - Component props.
 * @param props.redirectToCheckout - How the page leaves for the checkout URL the
 *   server returns. Defaults to a full-page navigation (`openUrl`, which refuses
 *   anything but http(s)); pass an in-app browser opener on native.
 * @returns The billing section.
 */
export function TiersUpgradeSection({
  redirectToCheckout = openUrl,
}: TiersUpgradeSectionProps = {}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [plan, setPlan] = useState<string>('Free')
  const [planKey, setPlanKey] = useState<string>('free')
  const [tiers, setTiers] = useState<Tier[]>([])
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
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
    return () => {
      cancelled = true
    }
  }, [http])

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
        redirectToCheckout(data.checkoutUrl)
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
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.billing', undefined, { defaultValue: 'Billing' })}
        </h3>
        <Flex align="center" justify="between">
          <span className={cm.textSize('sm')}>
            {t('settings.plan', undefined, { defaultValue: 'Plan: ' })}
            <strong>{plan}</strong>
          </span>
          {planKey === 'free' ? (
            <Button variant="outline" size="sm" onClick={() => setShowUpgrade(true)}>
              {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
            </Button>
          ) : (
            <ConfirmButton
              variant="outline"
              size="sm"
              label={t('settings.billing.cancel', undefined, { defaultValue: 'Cancel' })}
              confirmLabel={t('settings.billing.cancelConfirm', undefined, {
                defaultValue: 'Cancel your subscription?',
              })}
              onConfirm={handleCancelSubscription}
              data-mol-id="billing-cancel-subscription"
            />
          )}
        </Flex>
      </section>

      <Modal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title={t('settings.billing.upgradeTitle', undefined, {
          defaultValue: 'Upgrade your plan',
        })}
      >
        {upgradeError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {upgradeError}
          </Alert>
        ) : null}
        {tiers.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('settings.billing.noTiers', undefined, {
              defaultValue: 'No paid plans configured.',
            })}
          </p>
        ) : (
          <ul className={cm.stack(3)}>
            {tiers
              .filter((tier) => tier.planKey !== 'free')
              .flatMap((tier) =>
                tier.prices.filter((p) => p.stripePriceId).map((price) => ({ tier, price })),
              )
              .map(({ tier, price }) => (
                <li key={`${tier.planKey}-${price.stripePriceId}`} className={cm.sp('p', 4)}>
                  <Flex align="center" justify="between">
                    <div>
                      <p className={cm.fontWeight('semibold')}>
                        {tier.name} ({price.interval})
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{price.priceLabel}</p>
                    </div>
                    <Button
                      size="sm"
                      loading={upgradeLoading === price.stripePriceId}
                      onClick={() =>
                        price.stripePriceId && handleStartCheckout(price.stripePriceId)
                      }
                    >
                      {t('settings.billing.subscribe', undefined, {
                        defaultValue: 'Subscribe',
                      })}
                    </Button>
                  </Flex>
                </li>
              ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
