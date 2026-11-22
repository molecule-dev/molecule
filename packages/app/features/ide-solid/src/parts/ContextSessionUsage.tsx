/**
 * The consistent session-and-allowance rows for the context tooltip and
 * modal: what the current conversation spent (prompt and output tokens, a
 * live mark while the turn streams) and what remains of the project owner's
 * AI allowance (the percent, its window, and when it resets).
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ContextSessionUsage` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input. Presentational — the totals arrive whole as props; the
 * load-on-hover fetch is the `useContextSessionUsage` primitive beside it, the
 * counterpart of React's hook of the same name.
 *
 * Styling uses `getClassMap()` (`cm.*`); the component adds no inline styles.
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import {
  type ChatUsageTokens,
  formatTokenTotal,
  totalPromptTokens,
} from '@molecule/app-ide-panel-logic/panels'
import { useHttpClient, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** The usage the hook loads from `GET /projects/:id/chat-usage`. */
export interface SessionUsage extends ChatUsageTokens {
  /** The owner's remaining-allowance percent spent, when the plan meters it. */
  allowancePercent?: number | null
  /** When the allowance window rolls over (epoch milliseconds). */
  allowanceResetAt?: number | null
  /** The allowance's window: monthly against the billing period, or daily. */
  allowanceWindow?: 'daily' | 'billing-period'
  /** The model the conversation ran on. */
  model?: string
  /** Whether the conversation's turn is streaming right now. */
  streaming?: boolean
}

/** Props for {@link ContextSessionUsage} — the React prop names, React's own contract. */
export interface ContextSessionUsageProps {
  /** The loaded usage, or `null` before the first reply. */
  data: SessionUsage | null
  /** Whether a load is in flight (shown only while there is nothing to show). */
  loading: boolean
  /** Whether the last refresh failed (stated on the allowance row). */
  failed: boolean
}

/** How often the hook re-fetches while its summary is visible. */
const REFRESH_INTERVAL_MS = 15_000

/**
 * Loads the existing conversation totals only while their summary is visible.
 * Call it inside a component root (an `HttpProvider` in the tree supplies the
 * client). Re-fetches when the project, conversation or visibility changes
 * and every 15 seconds while visible; `refresh()` re-fetches at once. A
 * cancellation belongs to hover/navigation cleanup; a real failure is
 * rendered with retry rather than replacing missing usage with zero.
 *
 * @param projectId - The project whose chat usage to load, or an accessor of it.
 * @param conversationId - The conversation to scope the totals to, or an
 *   accessor of it (`null` scopes to the whole project).
 * @param active - Whether the summary is visible, or an accessor of it.
 * @returns The loaded state and `refresh()`.
 */
export function useContextSessionUsage(
  projectId: string | undefined | Accessor<string | undefined>,
  conversationId: string | null | undefined | Accessor<string | null | undefined>,
  active: boolean | Accessor<boolean>,
): {
  data: Accessor<SessionUsage | null>
  loading: Accessor<boolean>
  failed: Accessor<boolean>
  refresh: () => void
} {
  const http = useHttpClient()
  const [data, setData] = createSignal<SessionUsage | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const [revision, setRevision] = createSignal(0)

  createEffect(() => {
    // Tracked reads: the effect rebuilds on each change, the way React's
    // effect re-runs for a changed dependency. `revision` is read only to
    // subscribe — a bump re-fetches on the same mount.
    const project = typeof projectId === 'function' ? projectId() : projectId
    const conversation = typeof conversationId === 'function' ? conversationId() : conversationId
    const isActive = typeof active === 'function' ? active() : active
    void revision()
    if (!project || !isActive) return

    const controller = new AbortController()
    let pending = false

    /**
     * Fetches once, collapsing overlapping ticks the way React's `pending`
     * guard does, and ignores a reply the cleanup already cancelled.
     */
    const load = async (): Promise<void> => {
      if (pending) return
      pending = true
      setLoading(true)
      setFailed(false)
      try {
        const query = conversation ? `?conversationId=${encodeURIComponent(conversation)}` : ''
        const response = await http.get<SessionUsage>(
          `/projects/${encodeURIComponent(project)}/chat-usage${query}`,
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) {
          setData(response.data)
          setLoading(false)
          setFailed(false)
        }
      } catch (_error) {
        // Cancellation belongs to hover/navigation cleanup; real failures are
        // rendered with retry rather than replacing missing usage with zero.
        if (!controller.signal.aborted) {
          setLoading(false)
          setFailed(true)
        }
      } finally {
        pending = false
      }
    }

    void load()
    const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS)
    onCleanup(() => {
      controller.abort()
      clearInterval(timer)
    })
  })

  return {
    data,
    loading,
    failed,
    refresh: (): void => {
      setRevision((previous) => previous + 1)
    },
  }
}

/**
 * Consistent session and allowance rows for the context tooltip and modal.
 *
 * @param props - See {@link ContextSessionUsageProps}.
 * @returns The rendered rows.
 */
export function ContextSessionUsage(props: ContextSessionUsageProps): JSX.Element {
  const cm = getClassMap()
  const { t, locale } = useTranslation()

  // React computes these once per render from the props; Solid reads them
  // through accessors so the same values stay current between renders. Each
  // translated label also reads the locale, so a locale switch re-renders it
  // the way React's whole-component re-render does.
  const available = (): boolean => props.data !== null && !props.failed
  const remaining = (): number | null => {
    const percent = props.data?.allowancePercent
    return typeof percent === 'number' && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, 100 - percent))
      : null
  }
  /** Whether the remaining figure is low enough to turn red. */
  const remainingLow = (): boolean => {
    const rest = remaining()
    return available() && rest !== null && rest <= 10
  }

  /** The row's left label (`Current session` / `Overall AI allowance`). */
  const sessionLabel = (): string => {
    locale()
    return t('ide.chat.context.session', undefined, { defaultValue: 'Current session' })
  }

  /** The right-hand session total (or the loading / unavailable fallback). */
  const sessionTotal = (): string => {
    locale()
    const data = props.data
    return data !== null && !props.failed
      ? t(
          'ide.chat.context.sessionTotal',
          { tokens: formatTokenTotal(totalPromptTokens(data) + data.outputTokens) },
          { defaultValue: '{{tokens}} tokens' },
        )
      : props.loading
        ? t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
        : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  }

  /** The session line's muted detail, with the live mark while streaming. */
  const sessionDetail = (): string => {
    locale()
    const data = props.data
    if (data === null || props.failed) return ''
    const detail = t(
      'ide.chat.context.sessionDetail',
      {
        input: formatTokenTotal(totalPromptTokens(data)),
        output: formatTokenTotal(data.outputTokens),
      },
      { defaultValue: '{{input}} input (incl. cache) · {{output}} output' },
    )
    return data.streaming
      ? `${detail} · ${t('ide.chat.context.live', undefined, { defaultValue: 'Live' })}`
      : detail
  }

  /** The row's left label (`Overall AI allowance`). */
  const allowanceLabel = (): string => {
    locale()
    return t('ide.chat.context.allowance', undefined, { defaultValue: 'Overall AI allowance' })
  }

  /** The right-hand allowance figure (or the loading / unavailable fallback). */
  const allowanceValue = (): string => {
    locale()
    const rest = remaining()
    const percent = props.data?.allowancePercent
    return !available()
      ? props.loading
        ? t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
        : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
      : rest !== null
        ? t(
            'ide.chat.context.remainingPercent',
            { percent: rest },
            { defaultValue: '~{{percent}}% remaining' },
          )
        : percent === null
          ? t('ide.chat.context.unmetered', undefined, { defaultValue: 'Unmetered' })
          : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  }

  /**
   * The allowance row's muted line: the error, the shared-across-projects
   * note, the window, and the reset moment — the segments React renders (the
   * falsy ones as nothing), joined the way the DOM draws them.
   */
  const allowanceNote = (): string => {
    locale()
    const data = props.data
    let note = ''
    if (props.failed) {
      note += t('ide.chat.context.usageError', undefined, {
        defaultValue: 'Usage could not be refreshed. Open details to retry.',
      })
    } else if (available()) {
      note += t('ide.chat.context.ownerAllowance', undefined, {
        defaultValue: 'Shared across the project owner’s projects.',
      })
    }
    if (available() && data?.allowanceWindow) {
      note += ' '
      note +=
        data.allowanceWindow === 'billing-period'
          ? t('ide.chat.context.monthly', undefined, { defaultValue: 'Monthly allowance.' })
          : t('ide.chat.context.daily', undefined, { defaultValue: 'Daily allowance.' })
    }
    if (
      available() &&
      remaining() !== null &&
      typeof data?.allowanceResetAt === 'number' &&
      Number.isFinite(data.allowanceResetAt)
    ) {
      note += ' '
      note += t(
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
      )
    }
    return note
  }

  return (
    <div class={cm.flex({ direction: 'col', gap: 'sm' })} aria-live="polite">
      <div>
        <div class={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
          <span>{sessionLabel()}</span>
          <strong>{sessionTotal()}</strong>
        </div>
        {available() && <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{sessionDetail()}</div>}
      </div>
      <div>
        <div class={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
          <span>{allowanceLabel()}</span>
          <strong class={remainingLow() ? cm.textError : undefined}>{allowanceValue()}</strong>
        </div>
        <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{allowanceNote()}</div>
      </div>
    </div>
  )
}
