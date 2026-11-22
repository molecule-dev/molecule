import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface TripView {
  id: string
  property_id: string
  property_name: string
  city: string
  country: string
  check_in_iso: string
  check_out_iso: string
  guests: number
  total_cents: number
  confirmation_number: string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function BookingConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [trip, setTrip] = useState<TripView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/trips/${id}`)
      .then((res) => {
        if (cancelled) return
        setTrip(unwrapSingle<TripView>(res))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http])

  return loading ? (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 16), cm.textCenter, cm.mxAuto)}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'bg-success/10 rounded-full h-20 w-20 mx-auto',
        )}
      >
        <span className="material-symbols-outlined text-4xl text-success" aria-hidden="true">
          check_circle
        </span>
      </div>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('bookingConfirmation.heading', {}, { defaultValue: 'Booking confirmed' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 6), 'text-on-surface-variant')}>
        {t('bookingConfirmation.loading', {}, { defaultValue: 'Loading your reservation…' })}
      </p>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }))}
      >
        <Link
          to={`/trips/${id}`}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
          )}
        >
          {t('bookingConfirmation.viewTripCta', {}, { defaultValue: 'View trip' })}
        </Link>
        <Link
          to="/trips"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.allTripsCta', {}, { defaultValue: 'All trips' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.searchMoreCta', {}, { defaultValue: 'Browse more stays' })}
        </Link>
      </div>
    </div>
  ) : trip ? (
    <section
      className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 16), cm.textCenter, cm.mxAuto)}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'bg-success/10 rounded-full h-20 w-20 mx-auto',
        )}
      >
        <span className="material-symbols-outlined text-4xl text-success" aria-hidden="true">
          check_circle
        </span>
      </div>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('bookingConfirmation.heading', {}, { defaultValue: 'Booking confirmed' })}
      </h1>
      <>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 2), 'text-on-surface-variant')}>
          {t(
            'bookingConfirmation.subheadingForTrip',
            {
              property: trip.property_name,
              city: trip.city,
              country: trip.country,
              checkIn: fmtDate(trip.check_in_iso),
            },
            {
              defaultValue: "{{property}} in {{city}}, {{country}}. We'll see you on {{checkIn}}.",
            },
          )}
        </p>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 1), 'text-on-surface-variant')}>
          {t(
            'bookingConfirmation.dates',
            { checkIn: fmtDate(trip.check_in_iso), checkOut: fmtDate(trip.check_out_iso) },
            { defaultValue: '{{checkIn}} – {{checkOut}}' },
          )}
        </p>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 1), 'text-on-surface-variant')}>
          {t('common.countGuests', { count: trip.guests }, { defaultValue: '{{count}} guests' })}
          {' · '}
          {t(
            'bookingConfirmation.total',
            { total: fmt(trip.total_cents) },
            { defaultValue: 'Total {{total}}' },
          )}
        </p>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mb', 8), 'text-on-surface-variant')}
          data-testid="confirmation-number"
        >
          {t(
            'bookingConfirmation.confNumber',
            { id: trip.confirmation_number ?? trip.id },
            { defaultValue: 'Confirmation number: {{id}}' },
          )}
        </p>
      </>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }))}
      >
        <Link
          to={`/trips/${id}`}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
          )}
        >
          {t('bookingConfirmation.viewTripCta', {}, { defaultValue: 'View trip' })}
        </Link>
        <Link
          to="/trips"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.allTripsCta', {}, { defaultValue: 'All trips' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.searchMoreCta', {}, { defaultValue: 'Browse more stays' })}
        </Link>
      </div>
    </section>
  ) : (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 16), cm.textCenter, cm.mxAuto)}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'bg-success/10 rounded-full h-20 w-20 mx-auto',
        )}
      >
        <span className="material-symbols-outlined text-4xl text-success" aria-hidden="true">
          check_circle
        </span>
      </div>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {t('bookingConfirmation.heading', {}, { defaultValue: 'Booking confirmed' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 6), 'text-on-surface-variant')}>
        {t(
          'bookingConfirmation.fallback',
          {},
          { defaultValue: 'Your reservation is being processed.' },
        )}
      </p>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }))}
      >
        <Link
          to={`/trips/${id}`}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
          )}
        >
          {t('bookingConfirmation.viewTripCta', {}, { defaultValue: 'View trip' })}
        </Link>
        <Link
          to="/trips"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.allTripsCta', {}, { defaultValue: 'All trips' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'border border-outline rounded-full hover:bg-surface-container',
          )}
        >
          {t('bookingConfirmation.searchMoreCta', {}, { defaultValue: 'Browse more stays' })}
        </Link>
      </div>
    </div>
  )
}
