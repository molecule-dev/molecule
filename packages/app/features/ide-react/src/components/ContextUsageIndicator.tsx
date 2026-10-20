import { type JSX, useState } from 'react'

import type { ContextCategoryId, ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { formatTokenCount } from '@molecule/app-ai-models'
import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

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

/** A context indicator with measured request composition and a bounded usage history. */
export function ContextUsageIndicator({
  usage,
  history = [],
  compactions = [],
}: {
  usage: ContextUsage
  history?: ContextUsage[]
  compactions?: ContextCompaction[]
}): JSX.Element {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const target = usage.backgroundCompactAtTokens ?? usage.compactAtTokens
  const limit = Math.max(1, target ?? usage.contextWindow)
  const ratio = Math.max(0, usage.inputTokens / limit)
  const percent = Math.round(ratio * 100)
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
      <button
        type="button"
        className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTargetCompact)}
        style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}
        data-mol-id="chat-context-usage"
        title={label}
        aria-label={`${title}: ${label}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span>{percent}%</span>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
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
          />
        </svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <p>{label}</p>
        {target != null && (
          <p className={cm.textMuted}>
            {t('ide.chat.context.targetHelp', undefined, {
              defaultValue:
                'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
            })}
          </p>
        )}
        {composition && (
          <>
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
                    defaultValue: 'Provider usage is pending; current token counts are estimates.',
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
              <table style={{ width: '100%', textAlign: 'left' }}>
                <caption className={cm.srOnly}>
                  {t('ide.chat.context.breakdown', undefined, {
                    defaultValue: 'Request composition',
                  })}
                </caption>
                <thead>
                  <tr>
                    <th>
                      {t('ide.chat.context.category', undefined, { defaultValue: 'Category' })}
                    </th>
                    <th>
                      {t('ide.chat.context.tokens', undefined, { defaultValue: 'Est. tokens' })}
                    </th>
                    <th>{t('ide.chat.context.share', undefined, { defaultValue: 'Share' })}</th>
                    <th>{t('ide.chat.context.bytes', undefined, { defaultValue: 'Bytes' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {composition.categories
                    .filter((category) => category.bytes > 0 || category.unknownItems > 0)
                    .map((category) => (
                      <tr key={category.id}>
                        <th scope="row">
                          {t(`ide.chat.context.category.${category.id}`, undefined, {
                            defaultValue: categoryNames[category.id],
                          })}
                        </th>
                        <td>
                          {category.estimatedTokens?.toLocaleString() ?? '—'}
                          {category.unknownItems > 0 ? ' + ?' : ''}
                        </td>
                        <td>{category.percent == null ? '—' : `${category.percent}%`}</td>
                        <td>{category.bytes.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {samples.length > 1 && (
          <figure style={{ margin: '16px 0' }}>
            <figcaption>
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
          <div>
            <p>
              {t(
                'ide.chat.context.compactions',
                { count: compactions.length },
                { defaultValue: 'Completed compactions: {{count}}' },
              )}
            </p>
            <ul>
              {compactions.slice(-5).map((event, index) => (
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
          </div>
        )}
      </Modal>
    </>
  )
}
