import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CustomerProfile {
  id: string
  company: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  address: string[]
  payment_terms: string
  tags: string[]
  outstanding_cents: number
  ytd_billed_cents: number
  avg_days_to_pay: number
}

interface CustomerInvoice {
  id: string
  number: string
  issued_at: string | null
  due_date: string | null
  amount_cents: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
}

const TABS = ['invoices', 'payments', 'activity', 'notes'] as const
type Tab = (typeof TABS)[number]

const STATUS_COLOR: Record<CustomerInvoice['status'], string> = {
  draft: 'bg-surface-container',
  sent: 'bg-info/15 text-info',
  paid: 'bg-success/15 text-success',
  overdue: 'bg-error/15 text-error',
  void: 'bg-surface-container line-through',
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CustomerDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([])
  const [tab, setTab] = useState<Tab>('invoices')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/customers/${id}`).catch(() => null),
      http.get(`/api/invoices?customer_id=${id}`).catch(() => null),
    ])
      .then(([pRes, iRes]) => {
        if (cancelled) return
        setProfile(unwrapSingle<CustomerProfile>(pRes))
        setInvoices(unwrapList<CustomerInvoice>(iRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('customerDetail.loadError', {}, { defaultValue: 'Failed to load customer.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )

  // The design's section flow (stats, invoice history, billing panel) renders
  // even when the record is missing — the header carries the
  // "record unavailable" notice and the sections show their zero states.
  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/customers" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('customerDetail.back', {}, { defaultValue: 'All customers' })}
      </Link>

      {profile ? (
        <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{profile.company}</h1>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 2), 'flex-wrap')}>
              {profile.tags.map((tag) => (
                <span
                  key={tag}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'bg-primary-container',
                    cm.textPrimary,
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        </header>
      ) : (
        <div className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {t(
                'customerDetail.missingHeading',
                {},
                { defaultValue: 'Customer record unavailable' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {error ??
                t(
                  'customerDetail.missingBody',
                  {},
                  {
                    defaultValue:
                      'The requested customer record could not be loaded. It may have been removed, or you may not have access to it.',
                  },
                )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'customerDetail.missingHelp',
                {},
                {
                  defaultValue:
                    'Use the back link above to return to the list of customers, or pick a different record from there.',
                },
              )}
            </p>
          </>
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-6')}>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            <Stat
              label={t(
                'customerDetail.stat.outstandingBalance',
                {},
                { defaultValue: 'Outstanding balance' },
              )}
              value={fmtUsd(profile?.outstanding_cents ?? 0)}
            />
            <Stat
              label={t(
                'customerDetail.stat.totalBilledYtd',
                {},
                { defaultValue: 'Total billed YTD' },
              )}
              value={fmtUsd(profile?.ytd_billed_cents ?? 0)}
            />
            <Stat
              label={t(
                'customerDetail.stat.avgDaysToPay',
                {},
                { defaultValue: 'Average days to pay' },
              )}
              value={profile ? String(profile.avg_days_to_pay) : '—'}
            />
          </div>

          <div className={cm.cn(cm.card(), 'overflow-hidden')}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('p', 4), cm.sp('pb', 0))}>
              {t('customerDetail.recentInvoicesHeading', {}, { defaultValue: 'Recent invoices' })}
            </h2>
            <nav
              className={cm.cn('flex border-b border-outline-variant', cm.sp('mt', 2))}
              aria-label={t('customerDetail.tabsLabel', {}, { defaultValue: 'Customer tabs' })}
            >
              {TABS.map((tk) => (
                <button
                  key={tk}
                  type="button"
                  onClick={() => setTab(tk)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'border-b-2',
                    tab === tk
                      ? cm.cn('border-primary', cm.textPrimary)
                      : cm.cn(
                          'border-transparent',
                          'text-on-surface-variant',
                          'hover:text-on-surface',
                        ),
                  )}
                >
                  {t(
                    `customerDetail.tab.${tk}`,
                    {},
                    { defaultValue: tk.charAt(0).toUpperCase() + tk.slice(1) },
                  )}
                </button>
              ))}
            </nav>

            {tab === 'invoices' &&
              (invoices.length === 0 ? (
                <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
                  {t('customerDetail.noInvoices', {}, { defaultValue: 'No invoices yet.' })}
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {invoices.map((i) => (
                    <li key={i.id}>
                      <Link
                        to={`/invoices/${i.id}`}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.flex({ align: 'center', justify: 'between' }),
                          'hover:bg-surface-container',
                        )}
                      >
                        <div>
                          <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>
                            {i.number}
                          </p>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {t(
                              'customerDetail.invoiceMeta',
                              { issued: fmtDate(i.issued_at), due: fmtDate(i.due_date) },
                              { defaultValue: 'Issued {{issued}} · Due {{due}}' },
                            )}
                          </p>
                        </div>
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              cm.roundedFull,
                              STATUS_COLOR[i.status],
                            )}
                          >
                            {i.status}
                          </span>
                          <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                            {fmtUsd(i.amount_cents)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            {tab === 'payments' && (
              <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
                {t('customerDetail.paymentsEmpty', {}, { defaultValue: 'No payments recorded.' })}
              </p>
            )}
            {tab === 'activity' && (
              <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
                {t('customerDetail.activityEmpty', {}, { defaultValue: 'No activity yet.' })}
              </p>
            )}
            {tab === 'notes' && (
              <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
                {t('customerDetail.notesEmpty', {}, { defaultValue: 'No notes yet.' })}
              </p>
            )}
          </div>
        </section>

        <aside
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.card(),
            cm.sp('p', 6),
            'space-y-3 sticky top-24',
          )}
        >
          <h2 className={cm.sectionHeading}>{t('nav.contact', {}, { defaultValue: 'Contact' })}</h2>
          <p className={cm.fontWeight('semibold')}>{profile?.contact_name || '—'}</p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {profile?.contact_email || '—'}
          </p>
          {profile?.contact_phone ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {profile.contact_phone}
            </p>
          ) : null}
          <div className={cm.sp('pt', 2)}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('customerDetail.billingAddress', {}, { defaultValue: 'Billing address' })}
            </h3>
            {(profile?.address ?? []).length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>—</p>
            ) : (
              (profile?.address ?? []).map((line, i) => (
                <p key={i} className={cm.cn(cm.textSize('sm'))}>
                  {line}
                </p>
              ))
            )}
          </div>
          <div className={cm.sp('pt', 2)}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('customerDetail.billingTerms', {}, { defaultValue: 'Billing terms' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'))}>{profile?.payment_terms || '—'}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 1), 'tabular-nums')}
      >
        {value}
      </p>
    </div>
  )
}
