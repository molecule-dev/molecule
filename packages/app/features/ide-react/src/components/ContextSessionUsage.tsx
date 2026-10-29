import { type JSX, useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ChatUsageTokens, formatTokenTotal, totalPromptTokens } from './chat-cost-utilities.js'

interface SessionUsage extends ChatUsageTokens {
  allowancePercent?: number | null
  allowanceResetAt?: number | null
  allowanceWindow?: 'daily' | 'billing-period'
  model?: string
  streaming?: boolean
}

/** Load the existing conversation totals only while their summary is visible. */
export function useContextSessionUsage(
  projectId: string | undefined,
  conversationId: string | undefined,
  active: boolean,
): {
  data: SessionUsage | null
  loading: boolean
  failed: boolean
  refresh: () => void
} {
  const http = useHttpClient()
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({
    data: null as SessionUsage | null,
    loading: false,
    failed: false,
  })
  useEffect(() => {
    if (!projectId || !active) return
    const controller = new AbortController()
    let pending = false
    const load = async (): Promise<void> => {
      if (pending) return
      pending = true
      setState((previous) => ({ ...previous, loading: true, failed: false }))
      try {
        const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''
        const response = await http.get<SessionUsage>(
          `/projects/${encodeURIComponent(projectId)}/chat-usage${query}`,
          { signal: controller.signal },
        )
        if (!controller.signal.aborted)
          setState({ data: response.data, loading: false, failed: false })
      } catch (_error) {
        // Cancellation belongs to hover/navigation cleanup; real failures are
        // rendered with retry rather than replacing missing usage with zero.
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, loading: false, failed: true }))
      } finally {
        pending = false
      }
    }
    void load()
    const timer = setInterval(() => void load(), 15_000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [http, projectId, conversationId, active, revision])
  return { ...state, refresh: () => setRevision((previous) => previous + 1) }
}

/** Consistent session and allowance rows for the context tooltip and modal. */
export function ContextSessionUsage({
  data,
  loading,
  failed,
}: {
  data: SessionUsage | null
  loading: boolean
  failed: boolean
}): JSX.Element {
  const cm = getClassMap()
  const available = data && !failed
  const percent = data?.allowancePercent
  const remaining =
    typeof percent === 'number' && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, 100 - percent))
      : null
  const unknown = t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  const pending = t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })} aria-live="polite">
      <div>
        <div className={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
          <span>
            {t('ide.chat.context.session', undefined, { defaultValue: 'Current session' })}
          </span>
          <strong>
            {available
              ? t(
                  'ide.chat.context.sessionTotal',
                  { tokens: formatTokenTotal(totalPromptTokens(data) + data.outputTokens) },
                  { defaultValue: '{{tokens}} tokens' },
                )
              : loading
                ? pending
                : unknown}
          </strong>
        </div>
        {available && (
          <div className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
            {t(
              'ide.chat.context.sessionDetail',
              {
                input: formatTokenTotal(totalPromptTokens(data)),
                output: formatTokenTotal(data.outputTokens),
              },
              { defaultValue: '{{input}} input (incl. cache) · {{output}} output' },
            )}
            {data.streaming && (
              <> · {t('ide.chat.context.live', undefined, { defaultValue: 'Live' })}</>
            )}
          </div>
        )}
      </div>
      <div>
        <div className={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
          <span>
            {t('ide.chat.context.allowance', undefined, { defaultValue: 'Overall AI allowance' })}
          </span>
          <strong
            className={available && remaining != null && remaining <= 10 ? cm.textError : undefined}
          >
            {!available
              ? loading
                ? pending
                : unknown
              : remaining != null
                ? t(
                    'ide.chat.context.remainingPercent',
                    { percent: remaining },
                    { defaultValue: '~{{percent}}% remaining' },
                  )
                : percent === null
                  ? t('ide.chat.context.unmetered', undefined, { defaultValue: 'Unmetered' })
                  : unknown}
          </strong>
        </div>
        <div className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
          {failed
            ? t('ide.chat.context.usageError', undefined, {
                defaultValue: 'Usage could not be refreshed. Open details to retry.',
              })
            : available &&
              t('ide.chat.context.ownerAllowance', undefined, {
                defaultValue: 'Shared across the project owner’s projects.',
              })}
          {available && data.allowanceWindow && (
            <>
              {' '}
              {data.allowanceWindow === 'billing-period'
                ? t('ide.chat.context.monthly', undefined, { defaultValue: 'Monthly allowance.' })
                : t('ide.chat.context.daily', undefined, { defaultValue: 'Daily allowance.' })}
            </>
          )}
          {available &&
            remaining != null &&
            typeof data.allowanceResetAt === 'number' &&
            Number.isFinite(data.allowanceResetAt) && (
              <>
                {' '}
                {t(
                  'ide.chat.context.resets',
                  {
                    at: new Date(data.allowanceResetAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                  { defaultValue: 'Resets {{at}}.' },
                )}
              </>
            )}
        </div>
      </div>
    </div>
  )
}
