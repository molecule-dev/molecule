import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
// ConfirmButton: shared two-step destructive-action button — first click arms
// ("Confirm?"), second commits, 4s auto-disarm, Escape disarms, aria-live
// (replaces the window.confirm dialog).
import { ConfirmButton } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from '../components/UserMenu.js'

interface Annotation {
  id: string
  user_id: string
  model_id: string
  title: string
  description: string | null
  x: number | string
  y: number | string
  z: number | string
  position: number
  resolved: boolean
  created_at: string
  updated_at: string | null
}

interface ModelRow {
  id: string
  name?: string
  user_id: string
  visibility: string
}

function relativeTime(
  iso: string,
  t: (
    k: string,
    v?: Record<string, string | number | boolean | Date>,
    o?: { defaultValue: string },
  ) => string,
): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (minutes < 60) return t('common.minutesAgo', { minutes }, { defaultValue: '{{minutes}}m ago' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.hoursAgo', { hours }, { defaultValue: '{{hours}}h ago' })
  const days = Math.floor(hours / 24)
  return t('common.daysAgo', { days }, { defaultValue: '{{days}}d ago' })
}

function Annotations() {
  const cm = getClassMap()
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [model, setModel] = useState<ModelRow | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activePin, setActivePin] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState('360')
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Resolve a model — accept either a uuid in :id or fall back to the first
  // owned model (so visiting /annotations bare also has something to render).
  const resolveModel = useCallback(async (): Promise<ModelRow | null> => {
    const list: ModelRow[] = await http
      .get('/api/models')
      .then((res: unknown) =>
        Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown[] })?.data)
            ? (res as { data: ModelRow[] }).data
            : [],
      )
    if (id) {
      const exact = list.find((m) => String(m.id) === String(id))
      if (exact) return exact
    }
    return list[0] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchAnnotations = useCallback(
    async (modelId: string) => {
      const rows: Annotation[] = await http
        .get(`/api/annotations?model_id=${modelId}`)
        .then((res: unknown) =>
          Array.isArray(res)
            ? res
            : Array.isArray((res as { data?: unknown[] })?.data)
              ? (res as { data: Annotation[] }).data
              : [],
        )
      setAnnotations(rows)
      if (rows.length > 0 && activePin === null) setActivePin(rows[0].position ?? 0)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePin],
  )

  useEffect(() => {
    let cancelled = false
    setError(null)
    resolveModel()
      .then((m) => {
        if (cancelled) return
        setModel(m)
        if (m) return fetchAnnotations(m.id)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const refresh = useCallback(async () => {
    if (!model) return
    await fetchAnnotations(model.id)
  }, [model, fetchAnnotations])

  async function createAnnotation() {
    if (!model || busy === 'create') return
    setBusy('create')
    setError(null)
    try {
      const nextPosition =
        annotations.length > 0 ? Math.max(...annotations.map((a) => a.position ?? 0)) + 1 : 1
      await http.post('/api/annotations', {
        model_id: model.id,
        title: t(
          'annotations.defaultTitle',
          { n: nextPosition },
          { defaultValue: 'Annotation #{{n}}' },
        ),
        description: '',
        x: 0,
        y: 0,
        z: 0,
        position: nextPosition,
      })
      // Domain event: annotation created.
      void track({
        name: 'annotation.created',
        properties: { modelId: model.id, position: nextPosition },
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function toggleResolved(annotation: Annotation) {
    if (busy) return
    setBusy(`resolve-${annotation.id}`)
    setError(null)
    try {
      await http.put(`/api/annotations/${annotation.id}`, { resolved: !annotation.resolved })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function postReply(annotation: Annotation) {
    const reply = (replyDraft[annotation.id] ?? '').trim()
    if (!reply || busy) return
    setBusy(`reply-${annotation.id}`)
    setError(null)
    try {
      const stamp = new Date().toISOString().slice(11, 16)
      const next = [annotation.description ?? '', `↳ [${stamp}] ${reply}`]
        .filter(Boolean)
        .join('\n')
      await http.put(`/api/annotations/${annotation.id}`, { description: next })
      setReplyDraft((d) => ({ ...d, [annotation.id]: '' }))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function deleteAnnotation(annotation: Annotation) {
    if (busy) return
    // Confirmation is handled by the shared ConfirmButton (arm → confirm)
    // that wraps this handler — no window.confirm here.
    setBusy(`delete-${annotation.id}`)
    setError(null)
    try {
      await http.delete(`/api/annotations/${annotation.id}`)
      // Domain event: annotation deleted.
      if (model) {
        void track({
          name: 'annotation.deleted',
          properties: { modelId: model.id, annotationId: annotation.id },
        })
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const headerLabel =
    model?.name ?? t('annotations.noModelHeading', {}, { defaultValue: 'No model selected' })
  const pinPositions = useMemo(
    () =>
      annotations.slice(0, 8).map((a, idx) => ({
        id: a.id,
        label: a.position ?? idx + 1,
        top: `${20 + ((idx * 11) % 60)}%`,
        left: `${30 + ((idx * 7) % 50)}%`,
      })),
    [annotations],
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'bg-surface-container-low text-on-surface font-body h-screen w-screen overflow-hidden antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          'fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl border-b border-outline-variant/15 shadow-2xl shadow-black/40 h-[48px]',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tighter text-primary font-headline',
            )}
          >
            {t('common.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/models"
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              {t('nav.models', {}, { defaultValue: 'Models' })}
            </Link>
            <span className="material-symbols-outlined text-[16px] text-outline">
              chevron_right
            </span>
            <span className="text-on-surface" data-mol-id="annotations-model-name">
              {headerLabel}
            </span>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 4 })}>
          <div className="hidden md:flex gap-1">
            <button
              onClick={() => {
                void copyTextWithFallback(window.location.href).then((copied) => {
                  if (!copied) return
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                })
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                'py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all duration-300',
              )}
            >
              {copied
                ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
                : t('common.share', {}, { defaultValue: 'Share' })}
            </button>
          </div>
          <div
            className={cm.cn(
              cm.flex({ gap: 2 }),
              cm.sp('pl', 4),
              'border-l border-outline-variant/20',
            )}
          >
            <Link
              to="/settings"
              aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
              className={cm.cn(
                cm.roundedFull,
                'p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all duration-300',
              )}
            >
              <span className="material-symbols-outlined">settings</span>
            </Link>
            {/* Styled host for the shared control — bare, it reads as an
                unstyled browser widget bolted onto the styled bar. */}
            <div className="text-on-surface-variant hover:text-on-surface hover:bg-surface/5 rounded-lg transition-colors">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'relative w-full h-full pt-[48px]')}>
        <div
          className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 bg-surface-container-low')}
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(40,40,61,0.5) 0%, rgba(26,26,46,1) 100%)',
          }}
        ></div>

        {pinPositions.map((pin) => (
          <button
            key={pin.id}
            type="button"
            aria-pressed={activePin === pin.label}
            aria-label={t(
              'annotations.pinLabel',
              { number: pin.label },
              { defaultValue: 'Annotation pin {{number}}' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.cursorPointer,
              'absolute group',
            )}
            style={{ top: pin.top, left: pin.left }}
            onClick={() => setActivePin(pin.label)}
            data-mol-id={`annotation-pin-${pin.id}`}
          >
            <div
              className={cm.cn(
                cm.w(7),
                cm.h(7),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
              )}
            >
              {pin.label}
            </div>
          </button>
        ))}

        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'absolute bottom-8 left-6 z-30')}
        >
          <div
            className={cm.cn(
              cm.sp('p', 2),
              cm.flex({ align: 'center', gap: 2 }),
              'bg-surface-container-highest/70 backdrop-blur-lg border border-outline-variant/20 rounded-xl shadow-2xl shadow-black/50',
            )}
          >
            <button
              onClick={() => setPlaying((v) => !v)}
              aria-label={
                playing
                  ? t('common.pause', {}, { defaultValue: 'Pause' })
                  : t('common.play', {}, { defaultValue: 'Play' })
              }
              className={cm.cn(
                cm.sp('p', 2),
                'text-on-surface hover:text-on-primary hover:bg-primary/80 rounded-lg transition-colors',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {playing ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div
              className={cm.cn(
                cm.w(48),
                cm.h(1),
                cm.roundedFull,
                cm.sp('mx', 2),
                'bg-surface-container-lowest relative overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.h('full'),
                  cm.roundedFull,
                  'absolute top-0 left-0 bg-primary w-[35%]',
                )}
              ></div>
            </div>
            <span
              className={cm.cn(
                cm.textCenter,
                cm.w(12),
                'font-label text-[10px] text-on-surface-variant tabular-nums',
              )}
            >
              00:14:02
            </span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 2 }),
              'bg-surface-container-highest/60 backdrop-blur-xl border border-outline-variant/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
            )}
          >
            {(['360', 'pan_tool', 'zoom_in'] as const).map((tool) => (
              <button
                key={tool}
                onClick={() => setActiveTool(tool)}
                aria-pressed={activeTool === tool}
                className={`p-2.5 rounded-full transition-all ${activeTool === tool ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
              >
                <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                  {tool}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'fixed right-0 top-[48px] h-[calc(100vh-48px)] w-[360px] bg-surface text-foreground border-l border-border z-40 shadow-[-8px_0_32px_rgba(0,0,0,0.25)]',
          )}
        >
          <div className={cm.cn(cm.sp('p', 5), 'border-b border-border')}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2
                className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-foreground')}
              >
                {t('annotations.panelTitle', {}, { defaultValue: 'Annotations' })}
              </h2>
              <span
                data-mol-id="annotations-count"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  'bg-warning-light text-warning font-label uppercase tracking-wider',
                )}
              >
                {t(
                  'annotations.threadCount',
                  { count: annotations.length },
                  { defaultValue: '{{count}} threads' },
                )}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-secondary')}>
              {t(
                'annotations.panelSubtitle',
                {},
                { defaultValue: 'Review feedback from your collaborators' },
              )}
            </p>
          </div>

          <div className={cm.cn(cm.flex1, cm.sp('p', 4), 'overflow-y-auto space-y-4')}>
            {error ? (
              <div
                data-mol-id="annotations-error"
                role="alert"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('p', 3),
                  'rounded-md bg-error-container/20 text-error border border-error/30',
                )}
              >
                {error}
              </div>
            ) : null}
            {annotations.length === 0 ? (
              <p
                data-mol-id="annotations-empty"
                className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}
              >
                {t(
                  'annotations.empty',
                  {},
                  { defaultValue: 'No annotations yet — add your first one to start a thread.' },
                )}
              </p>
            ) : null}
            {annotations.map((annotation) => {
              const isActive = activePin === annotation.position
              const isResolved = !!annotation.resolved
              return (
                <div
                  key={annotation.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t(
                    'annotations.showPin',
                    { number: annotation.position },
                    { defaultValue: 'Show annotation pin {{number}}' },
                  )}
                  data-mol-id={`annotation-thread-${annotation.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.cursorPointer,
                    'rounded-lg border transition-colors',
                    isActive
                      ? 'border-tertiary bg-tertiary/10 shadow-sm'
                      : 'border-border bg-surface hover:border-border-secondary',
                  )}
                  onClick={() => setActivePin(annotation.position)}
                  onKeyDown={(e) => {
                    // Only react to keys on the card itself — the inline reply
                    // input/button inside have their own key handling.
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActivePin(annotation.position)
                    }
                  }}
                >
                  <header className={cm.cn(cm.flex({ align: 'start', gap: 3 }), cm.sp('mb', 3))}>
                    <div
                      className={cm.cn(
                        cm.w(7),
                        cm.h(7),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-tertiary text-on-tertiary font-label shrink-0',
                      )}
                    >
                      #{annotation.position}
                    </div>
                    <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-foreground',
                        )}
                        data-mol-id={`annotation-title-${annotation.id}`}
                      >
                        {annotation.title}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                        {relativeTime(annotation.created_at, t)}
                      </span>
                    </div>
                    <span
                      data-mol-id={`annotation-status-${annotation.id}`}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('medium'),
                        'font-label uppercase tracking-wider',
                        isResolved
                          ? 'bg-success-light text-success'
                          : 'bg-surface-secondary text-foreground-secondary',
                      )}
                    >
                      {isResolved
                        ? t('status.resolved', {}, { defaultValue: 'Resolved' })
                        : t('common.open', {}, { defaultValue: 'Open' })}
                    </span>
                  </header>
                  {annotation.description ? (
                    <pre
                      data-mol-id={`annotation-body-${annotation.id}`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mb', 3),
                        'text-foreground leading-relaxed whitespace-pre-wrap font-body',
                      )}
                    >
                      {annotation.description}
                    </pre>
                  ) : (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mb', 3),
                        'text-foreground-tertiary italic',
                      )}
                    >
                      {t('annotations.noDescription', {}, { defaultValue: 'No description yet.' })}
                    </p>
                  )}
                  <div className={cm.flex({ align: 'center', gap: 2 })}>
                    <input
                      type="text"
                      data-mol-id={`annotation-reply-input-${annotation.id}`}
                      aria-label={t(
                        'annotations.replyLabel',
                        {},
                        { defaultValue: 'Write a reply' },
                      )}
                      value={replyDraft[annotation.id] ?? ''}
                      onChange={(e) =>
                        setReplyDraft((d) => ({ ...d, [annotation.id]: e.target.value }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void postReply(annotation)
                        }
                      }}
                      className={cm.cn(
                        cm.flex1,
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        'rounded-md border border-border bg-surface-secondary text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary',
                      )}
                    />
                    <button
                      type="button"
                      data-mol-id={`annotation-reply-${annotation.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void postReply(annotation)
                      }}
                      disabled={
                        busy === `reply-${annotation.id}` ||
                        !(replyDraft[annotation.id] ?? '').trim()
                      }
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-md bg-tertiary text-on-tertiary hover:bg-tertiary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
                      )}
                    >
                      {t('common.reply', {}, { defaultValue: 'Reply' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id={`annotation-resolve-${annotation.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void toggleResolved(annotation)
                      }}
                      disabled={busy === `resolve-${annotation.id}` || !!busy}
                      className={cm.cn(
                        cm.sp('p', 2),
                        cm.roundedFull,
                        'text-foreground-tertiary hover:text-success hover:bg-success-light transition-colors disabled:opacity-40',
                      )}
                      aria-label={
                        isResolved
                          ? t('annotations.markUnresolved', {}, { defaultValue: 'Mark unresolved' })
                          : t('annotations.markResolved', {}, { defaultValue: 'Mark resolved' })
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isResolved ? 'check_circle' : 'check'}
                      </span>
                    </button>
                    {/* stopPropagation wrapper: ConfirmButton owns its own
                        click handling (arm → confirm), so the arm click must
                        not bubble to the card's "show pin" button. This span
                        is a pure event barrier, not a control — everything
                        interactive inside it is the native <button> below. */}
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- event barrier only; the native button inside carries keyboard support */}
                    <span onClick={(e) => e.stopPropagation()}>
                      <ConfirmButton
                        label={
                          <span
                            className="material-symbols-outlined text-[18px]"
                            aria-hidden="true"
                          >
                            delete_outline
                          </span>
                        }
                        confirmLabel={t(
                          'annotations.deleteConfirm',
                          {},
                          { defaultValue: 'Delete this annotation?' },
                        )}
                        aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
                        onConfirm={() => deleteAnnotation(annotation)}
                        testId={`annotation-delete-${annotation.id}`}
                        data-mol-id={`annotation-delete-${annotation.id}`}
                        disabled={busy === `delete-${annotation.id}` || !!busy}
                        size="sm"
                        color="error"
                        variant="ghost"
                        className={cm.roundedFull}
                      />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={cm.cn(cm.sp('p', 4), 'border-t border-border bg-surface-secondary')}>
            <button
              type="button"
              data-mol-id="annotation-new"
              disabled={!model?.id || busy === 'create'}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                'py-2.5 bg-tertiary text-on-tertiary hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-300',
              )}
              onClick={createAnnotation}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {busy === 'create'
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('annotations.newAnnotation', {}, { defaultValue: 'New Annotation' })}
            </button>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default Annotations
export { Annotations, Annotations as AnnotationsPage }
