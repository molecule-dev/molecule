import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { parsePassengerCount } from '../lib/passengers.js'

interface Passenger {
  first_name: string
  last_name: string
  date_of_birth: string
  passport_number: string
  frequent_flyer?: string
}

interface ApiFlight {
  id: string
  airline: string
  flight_number: string
  origin_code: string
  origin_city?: string | null
  destination_code: string
  destination_city?: string | null
  departure_time: string
  arrival_time: string
  duration_minutes: number
  stops: number
  cabin: string
  cabin_class?: string
  price: number
  price_cents: number
  currency: string
}

const STEPS = [
  { id: 'passengers', defaultLabel: 'Passengers', icon: 'group' },
  { id: 'payment', defaultLabel: 'Payment', icon: 'credit_card' },
  { id: 'review', defaultLabel: 'Review', icon: 'task_alt' },
] as const

function fmtPrice(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

function fmtTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(minutes: number): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function Booking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const passengers = parsePassengerCount(searchParams.get('passengers'))
  const navigate = useNavigate()
  const http = useHttpClient()

  const [flight, setFlight] = useState<ApiFlight | null>(null)
  const [flightError, setFlightError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<(typeof STEPS)[number]['id']>('passengers')
  const [passenger, setPassenger] = useState<Passenger>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    passport_number: '',
    frequent_flyer: '',
  })
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/flights/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: ApiFlight }).data ?? (res as unknown as ApiFlight)
        if (!data || !data.id) throw new Error('No flight payload')
        setFlight(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('[Booking] flight load failed:', err)
        setFlightError(
          t('booking.flightLoadError', {}, { defaultValue: 'Could not load flight details.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const totalPrice = useMemo(() => flight?.price ?? 0, [flight])
  const taxes = useMemo(() => Math.round(totalPrice * 0.08 * 100) / 100, [totalPrice])
  const baseFare = useMemo(
    () => Math.max(0, Math.round((totalPrice - taxes) * 100) / 100),
    [totalPrice, taxes],
  )
  // `totalPrice` is the per-seat fare; the trip is booked for `passengers` travelers.
  const grandTotal = useMemo(() => totalPrice * passengers, [totalPrice, passengers])

  function passengerValid(): boolean {
    return Boolean(
      passenger.first_name.trim() &&
      passenger.last_name.trim() &&
      passenger.date_of_birth.trim() &&
      passenger.passport_number.trim(),
    )
  }

  function paymentValid(): boolean {
    const digitsOnly = card.number.replace(/\s+/g, '')
    return Boolean(
      digitsOnly.length >= 12 &&
      card.name.trim() &&
      /^\d{2}\/\d{2}$/.test(card.expiry) &&
      /^\d{3,4}$/.test(card.cvc),
    )
  }

  async function handleSubmit() {
    if (!flight) {
      setError(t('booking.noFlight', {}, { defaultValue: 'Flight no longer available.' }))
      return
    }
    if (!passengerValid()) {
      setError(
        t(
          'booking.passenger.required',
          {},
          { defaultValue: 'Please complete all passenger details.' },
        ),
      )
      setActiveStep('passengers')
      return
    }
    if (!paymentValid()) {
      setError(
        t('booking.payment.required', {}, { defaultValue: 'Please enter valid payment details.' }),
      )
      setActiveStep('payment')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const flightPayload = {
        flight_id: flight.id,
        airline: flight.airline,
        flight_number: flight.flight_number,
        origin_code: flight.origin_code,
        origin_city: flight.origin_city,
        destination_code: flight.destination_code,
        destination_city: flight.destination_city,
        departure_time: flight.departure_time,
        arrival_time: flight.arrival_time,
        duration_minutes: flight.duration_minutes,
        cabin: flight.cabin,
      }
      const tripRes = await http.post('/api/trips', {
        kind: 'booked',
        flight_payload: flightPayload,
        passenger_count: passengers,
        cabin: flight.cabin,
        total_cents: flight.price_cents * passengers,
        currency: flight.currency ?? 'USD',
      })
      const tripData =
        (tripRes as { data?: { id?: string } }).data ?? (tripRes as unknown as { id?: string })
      const tripId = tripData?.id
      await http.post('/api/bookings', {
        trip_id: tripId,
        flight_id: flight.id,
        passenger_count: passengers,
        total_cents: flight.price_cents * passengers,
        currency: flight.currency ?? 'USD',
        card_last4: card.number.replace(/\s+/g, '').slice(-4),
      })
      void track({
        name: 'trip.booked',
        properties: {
          trip_id: tripId ?? null,
          flight_id: flight.id,
          airline: flight.airline,
          origin: flight.origin_code,
          destination: flight.destination_code,
          passengers,
          total_cents: flight.price_cents * passengers,
        },
      })
      navigate('/trips', { replace: true })
    } catch (err: unknown) {
      console.error('[Booking] submit failed:', err)
      setError(
        t(
          'booking.submitError',
          {},
          { defaultValue: 'Could not complete booking. Please try again.' },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to={`/flight/${id}?passengers=${passengers}`}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-primary hover:underline',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('booking.backToDetail', {}, { defaultValue: 'Back to flight details' })}
      </Link>

      <div className={cm.cn(cm.sp('mt', 4), cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('booking.eyebrow', {}, { defaultValue: 'Checkout' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
        >
          {t('booking.heading', {}, { defaultValue: 'Confirm your trip' })}
        </h1>
      </div>

      {/* Stepper */}
      <ol
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'bg-surface rounded-2xl ring-1 ring-outline-variant/40 shadow-sm',
        )}
      >
        {STEPS.map((step, idx) => {
          const isActive = step.id === activeStep
          const idxOfActive = STEPS.findIndex((s) => s.id === activeStep)
          const isComplete = idx < idxOfActive
          return (
            <li key={step.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <button
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : isComplete
                      ? 'bg-cheapest-light text-cheapest'
                      : 'text-on-surface-variant',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                  {isComplete ? 'check_circle' : step.icon}
                </span>
                {t(`booking.steps.${step.id}`, {}, { defaultValue: step.defaultLabel })}
              </button>
              {idx < STEPS.length - 1 ? (
                <span
                  className={'hidden md:inline w-12 border-t border-dashed border-outline'}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      {/* Hoisted error banner. Some validation paths bounce the user
          back to a previous step (e.g. submitting from review with
          missing passenger fields), so we render the error outside the
          step branches to keep it visible no matter where we land. */}
      {error ? (
        <p
          role="alert"
          data-testid="booking-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40',
          )}
        >
          {activeStep === 'passengers' ? (
            <>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('booking.passenger.heading', {}, { defaultValue: 'Lead passenger' })}
              </h2>
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                <FieldInput
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  value={passenger.first_name}
                  onChange={(v) => setPassenger((p) => ({ ...p, first_name: v }))}
                  autoComplete="given-name"
                />
                <FieldInput
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  value={passenger.last_name}
                  onChange={(v) => setPassenger((p) => ({ ...p, last_name: v }))}
                  autoComplete="family-name"
                />
                <FieldInput
                  label={t('booking.passenger.dob', {}, { defaultValue: 'Date of birth' })}
                  value={passenger.date_of_birth}
                  onChange={(v) => setPassenger((p) => ({ ...p, date_of_birth: v }))}
                  type="date"
                />
                <FieldInput
                  label={t('booking.passenger.passport', {}, { defaultValue: 'Passport number' })}
                  value={passenger.passport_number}
                  onChange={(v) => setPassenger((p) => ({ ...p, passport_number: v }))}
                  autoComplete="off"
                />
                <FieldInput
                  label={t(
                    'booking.passenger.ff',
                    {},
                    { defaultValue: 'Frequent flyer (optional)' },
                  )}
                  value={passenger.frequent_flyer ?? ''}
                  onChange={(v) => setPassenger((p) => ({ ...p, frequent_flyer: v }))}
                  autoComplete="off"
                />
              </div>
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={() => setActiveStep('payment')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
                  )}
                >
                  {t('booking.continue', {}, { defaultValue: 'Continue to payment' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </>
          ) : activeStep === 'payment' ? (
            <>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
              </h2>
              <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                <FieldInput
                  label={t('booking.payment.cardNumber', {}, { defaultValue: 'Card number' })}
                  value={card.number}
                  onChange={(v) => setCard((c) => ({ ...c, number: v }))}
                  autoComplete="cc-number"
                />
                <FieldInput
                  label={t('booking.payment.cardName', {}, { defaultValue: 'Name on card' })}
                  value={card.name}
                  onChange={(v) => setCard((c) => ({ ...c, name: v }))}
                  autoComplete="cc-name"
                />
                <FieldInput
                  label={t('booking.payment.expiry', {}, { defaultValue: 'Expiry MM/YY' })}
                  value={card.expiry}
                  onChange={(v) => setCard((c) => ({ ...c, expiry: v }))}
                  autoComplete="cc-exp"
                />
                <FieldInput
                  label={t('booking.payment.cvc', {}, { defaultValue: 'CVC' })}
                  value={card.cvc}
                  onChange={(v) => setCard((c) => ({ ...c, cvc: v }))}
                  autoComplete="cc-csc"
                />
              </div>
              <div
                className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', justify: 'between' }))}
              >
                <button
                  type="button"
                  onClick={() => setActiveStep('passengers')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary',
                  )}
                >
                  {t('common.back', {}, { defaultValue: 'Back' })}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('review')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm',
                  )}
                >
                  {t('booking.continueReview', {}, { defaultValue: 'Review booking' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'uppercase tracking-[0.25em] text-on-surface-variant',
                )}
              >
                {t('booking.review.heading', {}, { defaultValue: 'Review and confirm' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('booking.review.passengerLabel', {}, { defaultValue: 'Passenger' })}
              </p>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 1))}>
                {passenger.first_name || '—'} {passenger.last_name}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('booking.review.cardLabel', {}, { defaultValue: 'Payment' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'tabular-nums')}>
                {card.number ? `**** **** **** ${card.number.slice(-4)}` : '—'}
              </p>

              {error ? (
                <p
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-error/10 text-error border border-error/30',
                  )}
                >
                  {error}
                </p>
              ) : null}

              <div
                className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', justify: 'between' }))}
              >
                <button
                  type="button"
                  onClick={() => setActiveStep('payment')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary',
                  )}
                >
                  {t('common.back', {}, { defaultValue: 'Back' })}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-xl bg-accent text-on-accent hover:bg-accent/90 transition-colors shadow-lg disabled:opacity-60',
                  )}
                >
                  {submitting
                    ? t('booking.submitting', {}, { defaultValue: 'Booking…' })
                    : t('booking.submit', {}, { defaultValue: 'Confirm and pay' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    lock
                  </span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* Order summary */}
        {flightError ? (
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40 lg:sticky lg:top-24 self-start',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('booking.summary.heading', {}, { defaultValue: 'Trip summary' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-error')}>{flightError}</p>
          </div>
        ) : !flight ? (
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40 lg:sticky lg:top-24 self-start',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('booking.summary.heading', {}, { defaultValue: 'Trip summary' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('booking.summary.loading', {}, { defaultValue: 'Loading flight…' })}
            </p>
          </div>
        ) : (
          <aside
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40 lg:sticky lg:top-24 self-start',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('booking.summary.heading', {}, { defaultValue: 'Trip summary' })}
            </p>
            <>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
                  )}
                >
                  {flight.origin_code}
                </span>
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  aria-hidden="true"
                >
                  arrow_right_alt
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-md bg-primary/10 text-primary tracking-widest uppercase',
                  )}
                >
                  {flight.destination_code}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {flight.airline} · {flight.flight_number} · {fmtTime(flight.departure_time)} ·{' '}
                {fmtDuration(flight.duration_minutes)} ·{' '}
                {flight.stops === 0
                  ? t('booking.summary.nonstop', {}, { defaultValue: 'Nonstop' })
                  : t(
                      'booking.summary.stops',
                      { count: flight.stops },
                      { defaultValue: '{{count}} stop' },
                    )}
              </p>
              <dl className={cm.cn(cm.sp('mt', 5), 'flex flex-col gap-2', cm.textSize('sm'))}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('booking.summary.fare', {}, { defaultValue: 'Fare' })}
                  </dt>
                  <dd className="tabular-nums font-semibold">{fmtPrice(baseFare)}</dd>
                </div>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('booking.summary.taxes', {}, { defaultValue: 'Taxes & fees' })}
                  </dt>
                  <dd className="tabular-nums font-semibold">{fmtPrice(taxes)}</dd>
                </div>
                {passengers > 1 ? (
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <dt className="text-on-surface-variant">
                      {t(
                        'booking.summary.travelers',
                        { count: passengers },
                        { defaultValue: 'Travelers' },
                      )}
                    </dt>
                    <dd className="tabular-nums font-semibold">×{passengers}</dd>
                  </div>
                ) : null}
              </dl>
              <div
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  cm.flex({ align: 'baseline', justify: 'between' }),
                  'border-t border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'tabular-nums text-primary',
                  )}
                >
                  {fmtPrice(grandTotal)}
                </span>
              </div>
            </>
          </aside>
        )}
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
  autoComplete?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />
    </label>
  )
}
