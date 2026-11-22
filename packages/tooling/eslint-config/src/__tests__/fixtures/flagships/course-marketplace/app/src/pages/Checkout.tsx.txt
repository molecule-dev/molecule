/**
 * Checkout — landing page after Stripe Checkout returns the user.
 *
 * Real per-course payment happens in Stripe Checkout (hosted), kicked
 * off from the CourseDetail page via /api/checkout/create-session.
 * Stripe redirects back here with `?session_id=cs_...` after the
 * customer pays. This page polls /api/checkout/session/:sessionId to
 * surface enrollment confirmation, then offers a CTA to start the
 * course. Without a session_id, the page falls back to a simple
 * "Looking for a checkout?" message and a link back to the catalog.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api, type CourseSummary } from '../lib/api.js'

interface SessionStatus {
  sessionId: string
  paymentStatus: string
  amountTotal: number | null
  courseId: string | null
  enrollmentId: string | null
}

export function Checkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search] = useSearchParams()
  const sessionId = search.get('session_id')
  const canceled = search.get('canceled')

  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [course, setCourse] = useState<CourseSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!sessionId)
  // Guard so the enroll event fires exactly once even though the poll re-runs.
  const trackedEnrollment = useRef(false)

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    let attempts = 0
    const tick = async () => {
      try {
        attempts++
        const s = await api<SessionStatus>(`/checkout/session/${sessionId}`)
        if (!alive) return
        setStatus(s)
        if (s.enrollmentId && s.paymentStatus === 'paid' && !trackedEnrollment.current) {
          trackedEnrollment.current = true
          track({
            name: 'course.enrolled',
            properties: { courseId: String(s.courseId ?? ''), status: 'paid' },
          })
        }
        if (s.courseId) {
          api<CourseSummary>(`/courses/${s.courseId}`)
            .then((c) => {
              if (alive) setCourse(c)
            })
            .catch(() => undefined)
        }
        // If Stripe is faster than the webhook, give the webhook a few
        // seconds to fulfil before giving up. Re-poll every 1.5s up to 6
        // attempts (~9 seconds total) until the enrollment row appears.
        if (!s.enrollmentId && s.paymentStatus === 'paid' && attempts < 6) {
          setTimeout(tick, 1500)
          return
        }
      } catch (err) {
        if (!alive) return
        const message = err instanceof Error ? err.message : 'Could not verify checkout'
        setError(message)
      } finally {
        if (alive && attempts >= 6) setLoading(false)
        if (alive) setLoading(false)
      }
    }
    void tick()
    return () => {
      alive = false
    }
  }, [sessionId])

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-3xl mx-auto w-full flex-1')}>
        {!sessionId && !canceled && (
          <div
            data-mol-id="checkout-empty"
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-primary mb-3')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shopping_cart
            </span>
            <h1 className={cm.cn('text-2xl font-extrabold text-on-surface mb-2')}>
              {t('checkout.empty.title', {}, { defaultValue: 'Looking for a checkout?' })}
            </h1>
            <p className={cm.cn('text-on-surface-variant text-sm mb-6')}>
              {t(
                'checkout.empty.body',
                {},
                {
                  defaultValue:
                    'Pick a course from the catalog and use the Enroll now button to start checkout.',
                },
              )}
            </p>
            <Link
              to="/browse"
              className={
                'inline-block bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'
              }
            >
              {t('checkout.empty.cta', {}, { defaultValue: 'Browse catalog' })}
            </Link>
          </div>
        )}

        {canceled && (
          <div
            data-mol-id="checkout-canceled"
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-error mb-3')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              cancel
            </span>
            <h1 className={cm.cn('text-2xl font-extrabold text-on-surface mb-2')}>
              {t('checkout.canceled.title', {}, { defaultValue: 'Checkout cancelled' })}
            </h1>
            <p className={cm.cn('text-on-surface-variant text-sm mb-6')}>
              {t(
                'checkout.canceled.body',
                {},
                { defaultValue: 'No charge was made. Pick up where you left off any time.' },
              )}
            </p>
            <Link
              to="/browse"
              className={
                'inline-block bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'
              }
            >
              {t('checkout.canceled.cta', {}, { defaultValue: 'Back to catalog' })}
            </Link>
          </div>
        )}

        {sessionId && loading && !status && (
          <div
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            <p
              data-mol-id="checkout-loading"
              className={cm.cn('text-on-surface-variant text-sm')}
              role="status"
            >
              {t('checkout.verifying', {}, { defaultValue: 'Verifying your enrollment…' })}
            </p>
          </div>
        )}
        {sessionId && (status || error) && (
          <div
            data-mol-id="checkout-result"
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            {error && (
              <>
                <span className={cm.cn('material-symbols-outlined text-5xl text-error mb-3')}>
                  error
                </span>
                <h1 className={cm.cn('text-2xl font-extrabold text-on-surface mb-2')}>
                  {t('checkout.errorTitle', {}, { defaultValue: 'Could not verify checkout' })}
                </h1>
                <p
                  data-mol-id="checkout-error"
                  className={cm.cn('text-on-surface-variant text-sm mb-6')}
                >
                  {error}
                </p>
              </>
            )}
            {status && (
              <>
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-5xl mb-3',
                    status.enrollmentId
                      ? 'text-[var(--color-lectura-green)]'
                      : 'text-on-surface-variant',
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {status.enrollmentId ? 'task_alt' : 'pending'}
                </span>
                <h1 className={cm.cn('text-3xl font-extrabold text-on-surface mb-2')}>
                  {status.enrollmentId
                    ? t('checkout.success.title', {}, { defaultValue: 'You’re enrolled!' })
                    : t('checkout.processing.title', {}, { defaultValue: 'Almost there…' })}
                </h1>
                <p
                  data-mol-id="checkout-payment-status"
                  className={cm.cn('text-on-surface-variant text-sm mb-2')}
                >
                  {t(
                    'checkout.paymentStatus',
                    { status: status.paymentStatus },
                    { defaultValue: 'Payment status: {{status}}' },
                  )}
                </p>
                {status.amountTotal != null && (
                  <p
                    data-mol-id="checkout-amount"
                    className={cm.cn('text-on-surface text-base mb-6')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {t(
                      'checkout.amountCharged',
                      { amount: `$${(status.amountTotal / 100).toFixed(2)}` },
                      { defaultValue: '{{amount}} charged' },
                    )}
                  </p>
                )}
                {course && (
                  <p
                    data-mol-id="checkout-course-title"
                    className={cm.cn('text-on-surface text-lg font-bold mb-6')}
                  >
                    {course.title}
                  </p>
                )}
                <div className={cm.cn('flex flex-wrap justify-center gap-3')}>
                  {status.courseId && (
                    <Link
                      to={`/courses/${status.courseId}`}
                      data-mol-id="checkout-go-course"
                      className={
                        'inline-block bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'
                      }
                    >
                      {t('checkout.startLearning', {}, { defaultValue: 'Start learning' })}
                    </Link>
                  )}
                  <Link
                    to="/my-learning"
                    data-mol-id="checkout-go-learning"
                    className={
                      'inline-block bg-surface-container-low text-on-surface px-5 py-2.5 rounded-xl font-bold hover:bg-surface-container-high'
                    }
                  >
                    {t('checkout.viewLibrary', {}, { defaultValue: 'View My Learning' })}
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Checkout
