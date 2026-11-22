import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from '../components/StatusPill.js'

interface NotificationApi {
  id: string
  user_id: string
  kind: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

interface NotificationListResponse {
  items: NotificationApi[]
  unread_count: number
}

const KIND_META: Record<string, { icon: string; bg: string; text: string }> = {
  response_received: { icon: 'how_to_vote', bg: 'bg-primary/15', text: 'text-primary' },
  mention: { icon: 'alternate_email', bg: 'bg-secondary/15', text: 'text-secondary' },
  share: {
    icon: 'share',
    bg: 'bg-[var(--color-accent-purple-bg)]',
    text: 'text-[color:var(--color-accent-purple)]',
  },
  milestone: { icon: 'flag', bg: 'bg-success-light', text: 'text-[color:var(--color-on-success)]' },
  team: { icon: 'groups', bg: 'bg-warning-light', text: 'text-[color:var(--color-on-warning)]' },
}

function metaForKind(kind: string) {
  return KIND_META[kind] ?? KIND_META.response_received
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

type Translator = (
  k: string,
  vars?: Record<string, string | number | boolean | Date>,
  opts?: { defaultValue: string },
) => string

function titleFor(notification: NotificationApi, t: Translator): string {
  const payload = notification.payload ?? {}
  if (typeof payload.title === 'string') return payload.title
  switch (notification.kind) {
    case 'response_received':
      return t('notifications.title.response_received', {}, { defaultValue: 'New survey response' })
    case 'mention':
      return t('notifications.title.mention', {}, { defaultValue: 'You were mentioned' })
    case 'share':
      return t('notifications.title.share', {}, { defaultValue: 'Share activity' })
    case 'milestone':
      return t('notifications.title.milestone', {}, { defaultValue: 'Milestone reached' })
    case 'team':
      return t('notifications.title.team', {}, { defaultValue: 'Team update' })
    default:
      return notification.kind.replace('_', ' ')
  }
}

function bodyFor(notification: NotificationApi): string {
  const payload = notification.payload ?? {}
  if (typeof payload.body === 'string') return payload.body
  if (typeof payload.message === 'string') return payload.message
  return ''
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<NotificationListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<NotificationListResponse>('/api/notifications')
      .then((response) => {
        if (cancelled) return
        if (response?.data) setData(response.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load notifications.')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function markAllRead() {
    if (!data || data.unread_count === 0 || marking) return
    setMarking(true)
    setError(null)
    try {
      await http.post('/api/notifications/mark-all-read')
      const refreshed = await http.get<NotificationListResponse>('/api/notifications')
      if (refreshed?.data) setData(refreshed.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notifications as read.')
    } finally {
      setMarking(false)
    }
  }

  async function markOneRead(id: string) {
    setError(null)
    try {
      await http.patch(`/api/notifications/${id}`, { read: true })
      const refreshed = await http.get<NotificationListResponse>('/api/notifications')
      if (refreshed?.data) setData(refreshed.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update notification.')
    }
  }

  const items = data?.items ?? null
  const unread = data?.unread_count ?? 0

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, cm.w('full'))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </span>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
            {unread > 0 && (
              <span
                data-testid="notifications-unread-count"
                className={cm.cn(
                  cm.sp('ml', 3),
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-white',
                )}
              >
                {unread}
              </span>
            )}
          </h1>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={marking}
              data-testid="mark-all-read"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] text-on-surface hover:bg-surface-secondary transition-colors disabled:opacity-60',
              )}
            >
              {marking
                ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
            </button>
          )}
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notifications.subheading',
            {},
            { defaultValue: 'Responses and account activity, sorted newest first.' },
          )}
        </p>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </div>

      {items === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 2 }),
            cm.sp('p', 8),
            'rounded-xl bg-surface border border-[color:var(--color-border)] text-center',
          )}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 36 }}
            aria-hidden="true"
          >
            notifications_none
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'No activity yet — responses and updates will show up here.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          {items.map((entry) => {
            const meta = metaForKind(entry.kind)
            const title = titleFor(entry, t)
            const body = bodyFor(entry)
            const isUnread = entry.read_at === null
            return (
              <li key={entry.id}>
                <div
                  data-testid={`notification-${entry.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 3 }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface border border-[color:var(--color-border)] hover:border-primary/40 transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      meta.bg,
                      meta.text,
                      'shrink-0',
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div
                    className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, 'min-w-0')}
                  >
                    <div
                      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}
                    >
                      <span
                        className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface truncate')}
                      >
                        {title}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant shrink-0 tabular-nums',
                        )}
                      >
                        {relativeTime(entry.created_at)}
                      </span>
                    </div>
                    {body && (
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{body}</p>
                    )}
                    {isUnread && (
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                        <StatusPill
                          variant="unread"
                          label={t('status.new', {}, { defaultValue: 'New' })}
                        />
                        <button
                          type="button"
                          onClick={() => markOneRead(entry.id)}
                          data-testid={`mark-read-${entry.id}`}
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('xs'),
                            'text-primary hover:underline',
                          )}
                        >
                          {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Notifications
