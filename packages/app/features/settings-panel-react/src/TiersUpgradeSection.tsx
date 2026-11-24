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
 * Upgrade modal with a Subscribe button per price that is for sale (one
 * the server lists with a price id). Upgrade appears only for a free user
 * and only when something is for sale. Subscribe POSTs to
 * `/api/billing/checkout` and redirects to the checkout URL; a paid user
 * (`isFree: false` in the status) sees a Cancel button that POSTs to
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

  const [plan, setPlan] = useState<string | null>(null)
  const [planKey, setPlanKey] = useState<string | null>(null)
  const [isFree, setIsFree] = useState(true)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [statusVersion, setStatusVersion] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState('')
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
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
        if (cancelled) return
        const status = statusRes?.data ?? null
        if (status?.name) setPlan(status.name)
        if (status?.planKey) setPlanKey(status.planKey)
        if (typeof status?.isFree === 'boolean') setIsFree(status.isFree)
        const list = tiersRes?.data?.data
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
  }, [http, statusVersion])

  // What can be bought: a price the server lists with a price id, on a tier the user is not on.
  const forSale = tiers
    .filter((tier) => tier.planKey !== planKey)
    .flatMap((tier) =>
      tier.prices.flatMap((price) =>
        price.stripePriceId ? [{ tier, price, priceId: price.stripePriceId }] : [],
      ),
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
    setCancelError('')
    try {
      await http.post('/api/billing/cancel', {})
      // The server decides what the plan is now (a provider may cancel at period end).
      setStatusVersion((version) => version + 1)
    } catch (err) {
      setCancelError(
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
          {/* The plan line waits for the server: there is no plan name to guess. */}
          {plan ? (
            <span className={cm.textSize('sm')}>
              {t('settings.plan', undefined, { defaultValue: 'Plan: ' })}
              <strong>{plan}</strong>
            </span>
          ) : (
            <span />
          )}
          {isFree ? (
            forSale.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setShowUpgrade(true)}>
                {t('settings.upgrade', undefined, { defaultValue: 'Upgrade' })}
              </Button>
            ) : null
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
        {cancelError ? (
          <Alert status="error" className={cm.sp('mt', 3)}>
            {cancelError}
          </Alert>
        ) : null}
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
        <ul className={cm.stack(3)}>
          {forSale.map(({ tier, price, priceId }) => (
            <li key={`${tier.planKey}-${priceId}`} className={cm.sp('p', 4)}>
              <Flex align="center" justify="between">
                <div>
                  <p className={cm.fontWeight('semibold')}>
                    {tier.name} ({price.interval})
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{price.priceLabel}</p>
                </div>
                <Button
                  size="sm"
                  loading={upgradeLoading === priceId}
                  onClick={() => handleStartCheckout(priceId)}
                >
                  {t('settings.billing.subscribe', undefined, {
                    defaultValue: 'Subscribe',
                  })}
                </Button>
              </Flex>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
