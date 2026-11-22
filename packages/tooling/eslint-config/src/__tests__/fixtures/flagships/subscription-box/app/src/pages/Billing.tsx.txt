import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import {
  type ApiBillingStatus,
  type ApiBillingTier,
  type ApiPlan,
  type ApiSubscription,
  centsToLabel,
  formatDate,
  unwrapList,
  unwrapSingle,
} from '../lib/api.js'

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()
  const userObj = typeof user === 'object' && user ? (user as Record<string, unknown>) : null

  const [status, setStatus] = useState<ApiBillingStatus | null>(null)
  const [tiers, setTiers] = useState<ApiBillingTier[]>([])
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () =>
    Promise.all([
      http
        .get('/api/billing/status')
        .then(unwrapSingle<ApiBillingStatus>)
        .catch(() => null),
      http
        .get('/api/billing/tiers')
        .then(unwrapList<ApiBillingTier>)
        .catch(() => []),
      http
        .get('/api/plans')
        .then(unwrapList<ApiPlan>)
        .catch(() => []),
      http
        .get('/api/subscriptions/mine')
        .then(unwrapSingle<ApiSubscription>)
        .catch(() => null),
    ])

  useEffect(() => {
    let cancelled = false
    refresh()
      .then(([s, ts, ps, sub]) => {
        if (cancelled) return
        setStatus(s)
        setTiers(ts)
        setPlans(ps)
        setSubscription(sub)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const startCheckout = async (priceId: string) => {
    setActioning(true)
    setFeedback(null)
    setError(null)
    try {
      // useHttpClient().post() returns the HttpResponse envelope; unwrap
      // before reading checkoutUrl/updated. Without this, Stripe redirect
      // is silently dropped and the user stays on /billing.
      const result = unwrapSingle<CheckoutResponse>(
        await http.post('/api/billing/checkout', { priceId }),
      )
      if (result?.checkoutUrl) {
        track({ name: 'billing.checkout_started', properties: { priceId, source: 'billing' } })
        window.location.href = result.checkoutUrl
        return
      }
      if (result?.updated) {
        track({ name: 'box.subscribed', properties: { priceId, method: 'stripe' } })
        setFeedback(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
        const [s, , , sub] = await refresh()
        setStatus(s)
        setSubscription(sub)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActioning(false)
    }
  }

  const pause = async () => {
    if (!subscription) return
    setActioning(true)
    setFeedback(null)
    setError(null)
    try {
      const updated = unwrapSingle<ApiSubscription>(
        await http.post('/api/subscriptions/mine/pause', {}),
      )
      setSubscription(updated)
      setFeedback(t('billing.actions.paused', {}, { defaultValue: 'Subscription paused.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActioning(false)
    }
  }

  const resume = async () => {
    if (!subscription) return
    setActioning(true)
    setFeedback(null)
    setError(null)
    try {
      const updated = unwrapSingle<ApiSubscription>(
        await http.post('/api/subscriptions/mine/resume', {}),
      )
      setSubscription(updated)
      setFeedback(t('billing.actions.resumed', {}, { defaultValue: 'Subscription resumed.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActioning(false)
    }
  }

  const cancel = async () => {
    if (!subscription) return
    setActioning(true)
    setFeedback(null)
    setError(null)
    try {
      const updated = unwrapSingle<ApiSubscription>(
        await http.post('/api/subscriptions/mine/cancel', { reason: 'user-initiated' }),
      )
      setSubscription(updated)
      setFeedback(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActioning(false)
    }
  }

  const currentPlan = subscription
    ? (plans.find((p) => p.id === subscription.plan_id) ?? null)
    : null

  const billingName = String((userObj?.name as string) ?? '—')
  const billingEmail = String((userObj?.email as string) ?? '—')

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="billing-page"
    >
      <div>
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('billing.eyebrow', {}, { defaultValue: 'Plan & payments' })}
        </span>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'billing.subtitle',
            {},
            { defaultValue: 'Manage your tier, payment method, and review past activity.' },
          )}
        </p>
      </div>

      {loading ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-testid="billing-loading"
        >
          {t('billing.loading', {}, { defaultValue: 'Loading billing…' })}
        </div>
      ) : (
        <>
          {error && (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-error/10 text-error text-sm font-bold',
              )}
              role="alert"
              data-testid="billing-error"
            >
              {error}
            </p>
          )}
          {feedback && (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-success-light text-success text-sm font-bold',
              )}
              role="status"
              data-testid="billing-feedback"
            >
              {feedback}
            </p>
          )}
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'lg:grid-cols-3')}>
            <article
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 8),
                'rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
              )}
              data-testid="billing-plan-card"
            >
              <span
                className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-primary/80')}
              >
                {t('billing.plan.eyebrow', {}, { defaultValue: 'Active plan' })}
              </span>
              <h2
                className={cm.cn('text-3xl font-extrabold tracking-tight')}
                data-testid="billing-plan-name"
              >
                {currentPlan?.name ?? status?.name ?? t('nav.free', {}, { defaultValue: 'Free' })}
              </h2>
              <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
                <span className={cm.cn('text-4xl font-extrabold tabular-nums')}>
                  {currentPlan ? centsToLabel(currentPlan.price, currentPlan.currency) : '$0'}
                </span>
                <span
                  className={cm.cn(
                    'text-sm font-bold uppercase tracking-widest text-on-primary/80',
                  )}
                >
                  {`/ ${currentPlan?.interval ?? 'month'}`}
                </span>
              </div>
              {subscription?.next_billing_date && (
                <p className={cm.cn('text-sm text-on-primary/90 max-w-xs')}>
                  {t(
                    'billing.plan.next',
                    { date: formatDate(subscription.next_billing_date) },
                    { defaultValue: 'Renews automatically on {{date}}.' },
                  )}
                </p>
              )}
              {subscription && (
                <p
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-primary/80',
                  )}
                  data-testid="billing-plan-status"
                >
                  {t(
                    'billing.plan.status',
                    { status: subscription.status },
                    { defaultValue: 'Status: {{status}}' },
                  )}
                </p>
              )}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 2))}>
                <Link
                  to="/customize"
                  data-testid="billing-change-tier"
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.sp('px', 5),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'text-sm text-center bg-surface text-primary hover:bg-surface/90 transition-all',
                  )}
                >
                  {t('billing.plan.cta.change', {}, { defaultValue: 'Change tier' })}
                </Link>
                {subscription?.status === 'active' ? (
                  <button
                    type="button"
                    onClick={pause}
                    disabled={actioning}
                    data-testid="billing-pause"
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.sp('px', 5),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'text-sm border-2 border-on-primary/40 text-on-primary hover:bg-on-primary/10 transition-all disabled:opacity-60',
                    )}
                  >
                    {t('billing.plan.cta.pause', {}, { defaultValue: 'Pause subscription' })}
                  </button>
                ) : subscription?.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={resume}
                    disabled={actioning}
                    data-testid="billing-resume"
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.sp('px', 5),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'text-sm border-2 border-on-primary/40 text-on-primary hover:bg-on-primary/10 transition-all disabled:opacity-60',
                    )}
                  >
                    {t('billing.plan.cta.resume', {}, { defaultValue: 'Resume subscription' })}
                  </button>
                ) : null}
                {subscription && subscription.status !== 'cancelled' && (
                  <ConfirmButton
                    label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                    confirmLabel={t(
                      'billing.actions.confirmCancel',
                      {},
                      { defaultValue: 'Cancel your subscription? You can resubscribe anytime.' },
                    )}
                    pendingLabel={t(
                      'common.cancellingEllipsis',
                      {},
                      { defaultValue: 'Cancelling…' },
                    )}
                    onConfirm={cancel}
                    disabled={actioning}
                    disarmSeconds={6}
                    data-testid="billing-cancel"
                    className={cm.cn(
                      cm.sp('py', 2),
                      'text-xs font-bold text-on-primary/70 hover:text-on-primary underline transition-colors disabled:opacity-60',
                    )}
                  />
                )}
              </div>
              <div
                className={cm.cn(
                  'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/15 blur-3xl',
                )}
              />
            </article>

            <article
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
              )}
              data-testid="billing-payment-card"
            >
              <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
                {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
              </span>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'billing.payment.body',
                  {},
                  {
                    defaultValue:
                      'Payment is handled by Stripe Checkout — your full card number never touches our servers. Click any tier below to add or update your card.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl bg-on-surface text-surface',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')}>credit_card</span>
                </span>
                <span className={cm.cn('text-sm font-bold text-on-surface')}>
                  {subscription?.payment_subscription_id || subscription?.stripe_subscription_id
                    ? t('billing.payment.linked', {}, { defaultValue: 'Card on file via Stripe' })
                    : t('billing.payment.none', {}, { defaultValue: 'No card on file yet' })}
                </span>
              </div>
            </article>

            <article
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
              )}
              data-testid="billing-contact-card"
            >
              <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
                {t('billing.contact.eyebrow', {}, { defaultValue: 'Billing contact' })}
              </span>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span className={cm.cn('text-base font-extrabold text-on-surface')}>
                  {billingName}
                </span>
                <span className={cm.cn('text-sm text-on-surface-variant')}>{billingEmail}</span>
              </div>
              <Link
                to="/settings"
                data-testid="billing-edit-contact"
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 5),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-sm text-center border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
                )}
              >
                {t('billing.contact.cta.update', {}, { defaultValue: 'Edit billing contact' })}
              </Link>
            </article>
          </div>

          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
            data-testid="billing-tiers"
          >
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('billing.tiers.heading', {}, { defaultValue: 'Available tiers' })}
            </h2>
            <p className={cm.textMuted}>
              {t(
                'billing.tiers.body',
                {},
                { defaultValue: 'Pick a tier and we will route you to Stripe Checkout.' },
              )}
            </p>
            {tiers.length === 0 ? (
              <p className={cm.textMuted}>
                {t('billing.tiers.empty', {}, { defaultValue: 'No tiers configured yet.' })}
              </p>
            ) : (
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
                {tiers.map((tier) => (
                  <article
                    key={tier.key}
                    data-testid={`billing-tier-${tier.key}`}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 5),
                      'rounded-2xl border-2 border-outline-variant/30 hover:border-primary/40',
                    )}
                  >
                    <h3 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface')}>
                      {tier.name}
                    </h3>
                    <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                      {tier.prices.map((price) => (
                        <li
                          key={price.period}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          )}
                        >
                          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                            <span className={cm.cn('text-sm font-bold text-on-surface')}>
                              {price.price}
                            </span>
                            <span
                              className={cm.cn(
                                'text-[10px] uppercase tracking-widest text-on-surface-variant',
                              )}
                            >
                              {`per ${price.period}`}
                            </span>
                          </div>
                          {price.stripePriceId ? (
                            <button
                              type="button"
                              onClick={() => startCheckout(price.stripePriceId!)}
                              disabled={actioning}
                              data-testid={`billing-tier-${tier.key}-${price.period}`}
                              className={cm.cn(
                                cm.sp('px', 4),
                                'min-h-[40px]',
                                cm.fontWeight('bold'),
                                cm.roundedFull,
                                'text-xs uppercase tracking-widest bg-primary text-on-primary hover:bg-primary-hover transition-all disabled:opacity-60',
                              )}
                            >
                              {t('billing.tiers.choose', {}, { defaultValue: 'Choose' })}
                            </button>
                          ) : (
                            <span
                              className={cm.cn(
                                'text-[10px] uppercase tracking-widest text-on-surface-variant',
                              )}
                            >
                              {t('nav.free', {}, { defaultValue: 'Free' })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Billing
