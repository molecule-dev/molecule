import { type JSX, useEffect, useState } from 'react'

import type { ContextCategoryId, ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { formatTokenCount } from '@molecule/app-ai-models'
import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Modal, Progress, Tooltip } from '@molecule/app-ui-react'

import { ContextSessionUsage, useContextSessionUsage } from './ContextSessionUsage.js'

/** Merge final usage into its pre-dispatch sample without counting one request twice. */
export function mergeContextHistory(
  history: ContextUsage[],
  incoming: ContextUsage[],
): ContextUsage[] {
  const samples = new Map<string, ContextUsage>()
  for (const usage of [...history, ...incoming]) {
    if (!usage.requestId && !usage.at) continue
    const key = usage.requestId ?? usage.at!
    const previous = samples.get(key)
    // A slow history response must not replace provider-reported usage with an estimate.
    if (
      previous?.composition?.actualInputTokens != null &&
      usage.composition?.actualInputTokens == null
    )
      continue
    samples.set(key, usage)
  }
  const result = [...samples.values()].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  // Keep the first sample so the chart's origin survives long conversations.
  return result.length > 128 ? [result[0], ...result.slice(-127)] : result
}

const categoryNames: Record<ContextCategoryId, string> = {
  system: 'System instructions',
  summary: 'Previous summary',
  toolDefinitions: 'Tool definitions',
  serverTools: 'Provider tools',
  userText: 'User messages',
  assistantText: 'Assistant messages',
  reasoning: 'Reasoning',
  toolCalls: 'Tool arguments',
  toolResults: 'Tool results',
  images: 'Images',
  attachments: 'Attachments',
  structuralOverhead: 'Request structure',
}

interface ContextUsageIndicatorProps {
  usage: ContextUsage
  history?: ContextUsage[]
  compactions?: ContextCompaction[]
  projectId?: string
  conversationId?: string | null
  onOpenSettings?: () => void
}

/** A colored context ring with progressive context, session and allowance details. */
export function ContextUsageIndicator(props: ContextUsageIndicatorProps): JSX.Element {
  // Navigation must discard totals and in-flight requests from the old session.
  return (
    <ContextUsageView key={`${props.projectId ?? ''}:${props.conversationId ?? ''}`} {...props} />
  )
}

/** Own transient hover, modal and request state for one conversation. */
function ContextUsageView({
  usage,
  history = [],
  compactions = [],
  projectId,
  conversationId,
  onOpenSettings,
}: ContextUsageIndicatorProps): JSX.Element {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    if (!preview) return
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPreview(false)
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [preview])
  const session = useContextSessionUsage(projectId, conversationId, open || preview)
  const target = usage.backgroundCompactAtTokens ?? usage.compactAtTokens
  const limit = Math.max(1, target ?? usage.contextWindow)
  const ratio = Math.max(0, usage.inputTokens / limit)
  const percent = Math.round(ratio * 100)
  const color = ratio < 0.5 ? cm.textSuccess : ratio < 0.9 ? cm.textWarning : cm.textError
  const tone = ratio < 0.5 ? 'success' : ratio < 0.9 ? 'warning' : 'error'
  const status =
    target != null && ratio >= 1
      ? t('ide.chat.context.atTarget', undefined, { defaultValue: 'At compaction target' })
      : ratio >= 0.9
        ? t('ide.chat.context.nearTarget', undefined, { defaultValue: 'Context nearly full' })
        : t('ide.chat.context.healthy', undefined, { defaultValue: 'Context has room' })
  const title = t('ide.chat.context.title', undefined, { defaultValue: 'Context usage' })
  const targetLabel = target
    ? t('ide.chat.context.target', undefined, { defaultValue: 'Compaction target' })
    : t('ide.chat.context.window', undefined, { defaultValue: 'Context window' })
  const composition = usage.composition
  const label = t(
    'ide.chat.context.indicator',
    {
      tokens: formatTokenCount(usage.inputTokens),
      limit: formatTokenCount(limit),
      target: targetLabel,
      percent,
    },
    { defaultValue: '{{tokens}} / {{limit}} tokens · {{target}} ({{percent}}%)' },
  )
  const samples = mergeContextHistory(history, [usage])
  const contextSummary = (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <div className={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}>
        <strong>{status}</strong>
        <strong className={color}>{percent}%</strong>
      </div>
      <Progress value={percent} color={tone} size="sm" label={targetLabel} />
      <div className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
        {formatTokenCount(usage.inputTokens)} / {formatTokenCount(limit)}{' '}
        {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
        <div>
          {t(
            'ide.chat.context.headroom',
            { tokens: formatTokenCount(Math.max(0, limit - usage.inputTokens)) },
            { defaultValue: '{{tokens}} tokens of headroom' },
          )}
        </div>
      </div>
    </div>
  )
  const maxTokens = Math.max(limit, ...samples.map((sample) => sample.inputTokens), 1)
  const start = Date.parse(samples[0]?.at ?? '') || 0
  const end = Date.parse(samples.at(-1)?.at ?? '') || start
  const points = samples
    .map((sample, i) => {
      const x =
        end > start
          ? 8 + 304 * ((Date.parse(sample.at ?? '') - start) / (end - start))
          : 8 + 304 * (i / Math.max(1, samples.length - 1))
      return `${x},${88 - (80 * sample.inputTokens) / maxTokens}`
    })
    .join(' ')

  return (
    <>
      <div
        style={{ marginLeft: 'auto' }}
        onMouseEnter={() => setPreview(true)}
        onMouseLeave={() => setPreview(false)}
        onFocus={(event) => setPreview(event.target.matches(':focus-visible'))}
        onBlur={() => setPreview(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setPreview(false)
        }}
      >
        <Tooltip
          placement="top-end"
          style={{ width: 320, maxWidth: 'calc(100vw - 32px)', whiteSpace: 'normal' }}
          content={
            <div
              className={cm.flex({ direction: 'col', gap: 'md' })}
              style={{ padding: '8px 0' }}
              onMouseEnter={() => setPreview(true)}
              onMouseLeave={() => setPreview(false)}
            >
              {contextSummary}
              <div className={cm.borderT} style={{ paddingTop: 12 }}>
                <ContextSessionUsage {...session} />
              </div>
              <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                {t('ide.chat.context.openDetails', undefined, {
                  defaultValue: 'Click for breakdown, history and settings',
                })}
              </span>
            </div>
          }
        >
          <button
            type="button"
            className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
            style={{ display: 'inline-flex', gap: preview ? 4 : 0 }}
            data-mol-id="chat-context-usage"
            aria-label={`${title}: ${label}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => {
              setPreview(false)
              setOpen(true)
            }}
          >
            <span
              className={color}
              aria-hidden="true"
              data-ctx-pct=""
              style={{
                width: preview ? 'auto' : 0,
                opacity: preview ? 1 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 150ms',
              }}
            >
              {percent}%
            </span>
            <svg className={color} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <circle
                cx="9"
                cy="9"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity=".15"
              />
              <circle
                cx="9"
                cy="9"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${16 * Math.PI}`}
                strokeDashoffset={`${16 * Math.PI * (1 - Math.min(ratio, 1))}`}
                transform="rotate(-90 9 9)"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <div className={cm.flex({ direction: 'col', gap: 'lg' })}>
          <section className={cm.card({ variant: 'outline' })} style={cm.sp({ p: 4 })}>
            {contextSummary}
            <div className={cm.borderT} style={{ marginTop: 16, paddingTop: 16 }}>
              <ContextSessionUsage {...session} />
            </div>
          </section>
          <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
            {projectId && (
              <button
                type="button"
                data-mol-id="chat-context-refresh"
                className={cm.cn(
                  cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
                  cm.touchTargetCompact,
                )}
                disabled={session.loading}
                onClick={session.refresh}
              >
                {t('ide.chat.context.refresh', undefined, { defaultValue: 'Refresh usage' })}
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                data-mol-id="chat-context-settings"
                className={cm.cn(
                  cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
                  cm.touchTargetCompact,
                )}
                onClick={() => {
                  setOpen(false)
                  onOpenSettings()
                }}
              >
                {t('ide.chat.context.settings', undefined, { defaultValue: 'Chat settings' })}
              </button>
            )}
          </div>
          {target != null && (
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t('ide.chat.context.targetHelp', undefined, {
                defaultValue:
                  'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
              })}
            </p>
          )}
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t(
              'ide.chat.context.windowSize',
              { tokens: formatTokenCount(usage.contextWindow) },
              { defaultValue: 'Model context window: {{tokens}} tokens.' },
            )}
          </p>
          {composition && (
            <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
              <h3 className={cm.fontWeight('semibold')}>
                {t('ide.chat.context.breakdown', undefined, {
                  defaultValue: 'Request composition',
                })}
              </h3>
              <p>
                {composition.actualInputTokens != null
                  ? t(
                      'ide.chat.context.actual',
                      { tokens: composition.actualInputTokens.toLocaleString() },
                      {
                        defaultValue:
                          'Provider-reported input: {{tokens}} tokens (including cached input).',
                      },
                    )
                  : t('ide.chat.context.pending', undefined, {
                      defaultValue:
                        'Provider usage is pending; current token counts are estimates.',
                    })}
              </p>
              <p className={cm.textMuted}>
                {t(
                  'ide.chat.context.estimate',
                  {
                    tokens: composition.estimatedTokens.toLocaleString(),
                    bytes: composition.totalBytes.toLocaleString(),
                    chars: composition.totalChars.toLocaleString(),
                  },
                  {
                    defaultValue:
                      'Known text estimate: {{tokens}} tokens. Request: {{chars}} characters / {{bytes}} bytes. Shares describe estimated tokens, not billed allocation.',
                  },
                )}
              </p>
              {(composition.unknownTokenItems > 0 || composition.serializationFailures > 0) && (
                <p className={cm.textMuted}>
                  {t('ide.chat.context.unknown', undefined, {
                    defaultValue:
                      'Some image, attachment, or unmeasurable content has an unknown token cost and is excluded from estimated shares.',
                  })}
                </p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className={cm.table} style={{ textAlign: 'left' }}>
                  <caption className={cm.srOnly}>
                    {t('ide.chat.context.breakdown', undefined, {
                      defaultValue: 'Request composition',
                    })}
                  </caption>
                  <thead>
                    <tr>
                      <th className={cm.tableHead}>
                        {t('ide.chat.context.category', undefined, { defaultValue: 'Category' })}
                      </th>
                      <th className={cm.tableHead}>
                        {t('ide.chat.context.tokens', undefined, { defaultValue: 'Est. tokens' })}
                      </th>
                      <th className={cm.tableHead}>
                        {t('ide.chat.context.share', undefined, { defaultValue: 'Share' })}
                      </th>
                      <th className={cm.tableHead}>
                        {t('ide.chat.context.bytes', undefined, { defaultValue: 'Bytes' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...composition.categories]
                      .filter((category) => category.bytes > 0 || category.unknownItems > 0)
                      .sort((a, b) => (b.estimatedTokens ?? 0) - (a.estimatedTokens ?? 0))
                      .map((category) => (
                        <tr key={category.id} className={cm.tableRow}>
                          <th scope="row" className={cm.tableCell}>
                            {t(`ide.chat.context.category.${category.id}`, undefined, {
                              defaultValue: categoryNames[category.id],
                            })}
                          </th>
                          <td className={cm.tableCell}>
                            {category.estimatedTokens?.toLocaleString() ?? '—'}
                            {category.unknownItems > 0 ? ' + ?' : ''}
                          </td>
                          <td className={cm.tableCell}>
                            {category.percent == null ? '—' : `${category.percent}%`}
                          </td>
                          <td className={cm.tableCell}>{category.bytes.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {samples.length > 1 && (
            <figure style={{ margin: '16px 0' }}>
              <figcaption className={cm.fontWeight('semibold')}>
                {t(
                  'ide.chat.context.history',
                  { count: samples.length },
                  { defaultValue: 'Context over time · {{count}} requests' },
                )}
              </figcaption>
              <svg
                viewBox="0 0 320 96"
                role="img"
                aria-label={t('ide.chat.context.chart', undefined, {
                  defaultValue: 'Input tokens over time; dashed line marks the current target',
                })}
                style={{ width: '100%', height: 120 }}
              >
                <line
                  x1="8"
                  x2="312"
                  y1={88 - (80 * limit) / maxTokens}
                  y2={88 - (80 * limit) / maxTokens}
                  stroke="currentColor"
                  opacity=".4"
                  strokeDasharray="4 4"
                />
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <div
                className={cm.textMuted}
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>{start ? new Date(start).toLocaleTimeString() : ''}</span>
                <span>
                  {formatTokenCount(maxTokens)}{' '}
                  {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
                </span>
                <span>{end ? new Date(end).toLocaleTimeString() : ''}</span>
              </div>
            </figure>
          )}
          {compactions.length > 0 && (
            <details data-mol-id="chat-context-compactions">
              <summary>
                {t(
                  'ide.chat.context.compactions',
                  { count: compactions.length },
                  { defaultValue: 'Completed compactions: {{count}}' },
                )}
              </summary>
              <ul>
                {compactions.map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    {t(
                      'ide.chat.context.compaction',
                      {
                        at: new Date(event.at).toLocaleTimeString(),
                        before: event.beforeChars.toLocaleString(),
                        after: event.afterChars.toLocaleString(),
                        seconds: Math.round(event.elapsedMs / 1000),
                      },
                      { defaultValue: '{{at}} · {{before}} → {{after}} characters · {{seconds}}s' },
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Modal>
    </>
  )
}
