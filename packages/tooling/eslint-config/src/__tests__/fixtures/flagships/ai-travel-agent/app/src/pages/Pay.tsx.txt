import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { API_BASE_URL } from '../config.js'
import { formatDateTime, formatMoney } from '../lib/format.js'

interface Share {
  name: string
  amount_cents: number
  currency: string
  status: 'pending' | 'paid'
  paid_at: string | null
  flight: {
    flight_number: string
    origin_iata: string
    destination_iata: string
    depart_at: string
  } | null
}

/**
 * The pay link's target: public, no account needed. Shows one person's share
 * and settles it. The card entry is simulated (last four digits), the same
 * way the booking is charged in this template.
 */
function Pay() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [share, setShare] = useState<Share | null>(null)
  const [missing, setMissing] = useState(false)
  const [card, setCard] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pay/${token ?? ''}`)
        if (cancelled) return
        if (!res.ok) {
          setMissing(true)
          return
        }
        setShare((await res.json()) as Share)
      } catch (_error) {
        if (!cancelled) setMissing(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    const last4 = card.replace(/\D/g, '').slice(-4)
    if (last4.length !== 4) {
      setError(t('pay.cardInvalid', {}, { defaultValue: 'Enter a card number.' }))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/pay/${token ?? ''}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_last4: last4 }),
      })
      if (!res.ok)
        throw new Error(t('pay.failed', {}, { defaultValue: 'Payment did not go through.' }))
      const body = (await res.json()) as { status: 'paid'; paid_at: string }
      setShare((prev) => (prev ? { ...prev, status: 'paid', paid_at: body.paid_at } : prev))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('pay.failed', {}, { defaultValue: 'Payment did not go through.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('px', 6),
        'bg-background text-foreground relative overflow-hidden',
      )}
    >
      <AmbientOrbs />
      {missing ? (
        <div
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 8),
            'relative z-10 max-w-[440px] rounded-3xl bg-surface border border-border shadow-2xl shadow-primary/10',
          )}
        >
          <BrandWordmark as="span" size="sm" />
          <>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
              {t('pay.missingTitle', {}, { defaultValue: 'This pay link is no longer valid.' })}
            </h1>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('mt', 2))}>
              {t(
                'pay.missingBody',
                {},
                { defaultValue: 'Ask whoever booked the trip to send a new one.' },
              )}
            </p>
          </>
          <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 6))}>
            <Link to="/" className="hover:text-foreground">
              {t('pay.about', { app: APP_NAME }, { defaultValue: 'Sent by a {{app}} traveler.' })}
            </Link>
          </p>
        </div>
      ) : !share ? (
        <div
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 8),
            'relative z-10 max-w-[440px] rounded-3xl bg-surface border border-border shadow-2xl shadow-primary/10',
          )}
        >
          <BrandWordmark as="span" size="sm" />
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('mt', 4))}>
            {t('pay.loading', {}, { defaultValue: 'Loading…' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 6))}>
            <Link to="/" className="hover:text-foreground">
              {t('pay.about', { app: APP_NAME }, { defaultValue: 'Sent by a {{app}} traveler.' })}
            </Link>
          </p>
        </div>
      ) : (
        <main
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 8),
            'relative z-10 max-w-[440px] rounded-3xl bg-surface border border-border shadow-2xl shadow-primary/10',
          )}
          data-mol-id="pay-card"
        >
          <BrandWordmark as="span" size="sm" />
          <>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
              {t('pay.title', { name: share.name }, { defaultValue: '{{name}}, your share' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 4),
                'tabular-nums',
              )}
              data-mol-id="pay-amount"
            >
              {formatMoney(share.amount_cents, share.currency)}
            </p>
            {share.flight ? (
              <p className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('mt', 2))}>
                {share.flight.flight_number} · {share.flight.origin_iata} →{' '}
                {share.flight.destination_iata} · {formatDateTime(share.flight.depart_at)}
              </p>
            ) : null}
            {share.status === 'paid' ? (
              <p
                role="status"
                data-mol-id="pay-done"
                className={cm.cn(
                  cm.sp('mt', 6),
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-success/15 text-success border border-success/30',
                )}
              >
                {t('pay.paid', {}, { defaultValue: 'Paid. Thank you.' })}
              </p>
            ) : (
              <form
                onSubmit={pay}
                className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(3), cm.sp('mt', 6))}
              >
                <label
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textSize('sm'))}
                >
                  <span className={cm.fontWeight('semibold')}>
                    {t('pay.cardLabel', {}, { defaultValue: 'Card number' })}
                  </span>
                  <input
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    data-mol-id="pay-card-number"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none tabular-nums',
                    )}
                  />
                </label>
                {error ? (
                  <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  data-mol-id="pay-submit"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.sp('py', 3),
                    'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 disabled:opacity-50 transition-all',
                  )}
                >
                  {t(
                    'pay.submit',
                    { amount: formatMoney(share.amount_cents, share.currency) },
                    { defaultValue: 'Pay {{amount}}' },
                  )}
                </button>
              </form>
            )}
          </>
          <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 6))}>
            <Link to="/" className="hover:text-foreground">
              {t('pay.about', { app: APP_NAME }, { defaultValue: 'Sent by a {{app}} traveler.' })}
            </Link>
          </p>
        </main>
      )}
    </div>
  )
}

export default Pay
export { Pay, Pay as PayPage }
