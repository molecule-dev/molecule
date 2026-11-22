/**
 * The consistent session-and-allowance rows for the context tooltip and
 * modal: what the current conversation spent (prompt and output tokens, a
 * live mark while the turn streams) and what remains of the project owner's
 * AI allowance (the percent, its window, and when it resets).
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ContextSessionUsage` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input. Presentational — the totals arrive whole as props; the
 * load-on-hover fetch is the `useContextSessionUsage` composable beside it,
 * the counterpart of React's hook of the same name.
 *
 * Styling uses `getClassMap()` (`cm.*`); the component adds no inline styles.
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type MaybeRefOrGetter,
  type PropType,
  type Ref,
  ref,
  toValue,
  type VNodeChild,
  watch,
} from 'vue'

import {
  type ChatUsageTokens,
  formatTokenTotal,
  totalPromptTokens,
} from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

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
 * Call it in setup context (an `HttpProvider` in the tree supplies the
 * client). Re-fetches when the project, conversation or visibility changes
 * and every 15 seconds while visible; `refresh()` re-fetches at once. A
 * cancellation belongs to hover/navigation cleanup; a real failure is
 * rendered with retry rather than replacing missing usage with zero.
 *
 * @param projectId - The project whose chat usage to load, or a ref/getter of it.
 * @param conversationId - The conversation to scope the totals to, or a
 *   ref/getter of it (`null` scopes to the whole project).
 * @param active - Whether the summary is visible, or a ref/getter of it.
 * @returns The loaded state and `refresh()`.
 */
export function useContextSessionUsage(
  projectId: string | undefined | MaybeRefOrGetter<string | undefined>,
  conversationId: string | null | undefined | MaybeRefOrGetter<string | null | undefined>,
  active: boolean | MaybeRefOrGetter<boolean>,
): {
  data: Ref<SessionUsage | null>
  loading: Ref<boolean>
  failed: Ref<boolean>
  refresh: () => void
} {
  const http = useHttpClient()
  const data = ref<SessionUsage | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  const revision = ref(0)

  watch(
    [
      (): string | undefined => toValue(projectId),
      (): string | null | undefined => toValue(conversationId),
      (): boolean => toValue(active),
      revision,
    ],
    ([project, conversation, isActive], _previous, onCleanup) => {
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
        loading.value = true
        failed.value = false
        try {
          const query = conversation ? `?conversationId=${encodeURIComponent(conversation)}` : ''
          const response = await http.get<SessionUsage>(
            `/projects/${encodeURIComponent(project)}/chat-usage${query}`,
            { signal: controller.signal },
          )
          if (!controller.signal.aborted) {
            data.value = response.data
            loading.value = false
            failed.value = false
          }
        } catch (_error) {
          // Cancellation belongs to hover/navigation cleanup; real failures
          // are rendered with retry rather than replacing missing usage with
          // zero.
          if (!controller.signal.aborted) {
            loading.value = false
            failed.value = true
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
    },
    { immediate: true },
  )

  return {
    data,
    loading,
    failed,
    refresh: (): void => {
      revision.value++
    },
  }
}

/**
 * Consistent session and allowance rows for the context tooltip and modal.
 *
 * @param props - See {@link ContextSessionUsageProps}.
 * @returns The rendered rows.
 */
export const ContextSessionUsage = defineComponent({
  name: 'ContextSessionUsage',
  props: {
    /** The loaded usage, or `null` before the first reply. */
    data: { type: [Object, null] as PropType<SessionUsage | null>, required: true },
    /** Whether a load is in flight (shown only while there is nothing to show). */
    loading: { type: Boolean, required: true },
    /** Whether the last refresh failed (stated on the allowance row). */
    failed: { type: Boolean, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const data = props.data
      const available = data !== null && !props.failed
      const percent = data?.allowancePercent
      const remaining =
        typeof percent === 'number' && Number.isFinite(percent)
          ? Math.max(0, Math.min(100, 100 - percent))
          : null
      const unknown = t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
      const pending = t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })

      // The allowance row's muted line: the error, the shared-across-projects
      // note, the window, and the reset moment — the segments React renders
      // (the falsy ones as nothing), joined the way the DOM draws them.
      let allowanceNote = ''
      if (props.failed) {
        allowanceNote += t('ide.chat.context.usageError', undefined, {
          defaultValue: 'Usage could not be refreshed. Open details to retry.',
        })
      } else if (available) {
        allowanceNote += t('ide.chat.context.ownerAllowance', undefined, {
          defaultValue: 'Shared across the project owner’s projects.',
        })
      }
      if (available && data?.allowanceWindow) {
        allowanceNote += ' '
        allowanceNote +=
          data.allowanceWindow === 'billing-period'
            ? t('ide.chat.context.monthly', undefined, { defaultValue: 'Monthly allowance.' })
            : t('ide.chat.context.daily', undefined, { defaultValue: 'Daily allowance.' })
      }
      if (
        available &&
        remaining !== null &&
        typeof data?.allowanceResetAt === 'number' &&
        Number.isFinite(data.allowanceResetAt)
      ) {
        allowanceNote += ' '
        allowanceNote += t(
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

      return h('div', { class: cm.flex({ direction: 'col', gap: 'sm' }), 'aria-live': 'polite' }, [
        h('div', [
          h('div', { class: cm.flex({ justify: 'between', gap: 'md', align: 'baseline' }) }, [
            h('span', [
              t('ide.chat.context.session', undefined, { defaultValue: 'Current session' }),
            ]),
            h('strong', [
              available
                ? t(
                    'ide.chat.context.sessionTotal',
                    {
                      tokens: formatTokenTotal(totalPromptTokens(data) + data.outputTokens),
                    },
                    { defaultValue: '{{tokens}} tokens' },
                  )
                : props.loading
                  ? pending
                  : unknown,
            ]),
          ]),
          available
            ? h('div', { class: cm.cn(cm.textMuted, cm.textSize('xs')) }, [
                t(
                  'ide.chat.context.sessionDetail',
                  {
                    input: formatTokenTotal(totalPromptTokens(data)),
                    output: formatTokenTotal(data.outputTokens),
                  },
                  { defaultValue: '{{input}} input (incl. cache) · {{output}} output' },
                ),
                ...(data.streaming
                  ? [' · ', t('ide.chat.context.live', undefined, { defaultValue: 'Live' })]
                  : []),
              ])
            : null,
        ]),
        h('div', [
          h('div', { class: cm.flex({ justify: 'between', gap: 'md', align: 'baseline' }) }, [
            h('span', [
              t('ide.chat.context.allowance', undefined, {
                defaultValue: 'Overall AI allowance',
              }),
            ]),
            h(
              'strong',
              {
                class:
                  available && remaining !== null && remaining <= 10 ? cm.textError : undefined,
              },
              [
                !available
                  ? props.loading
                    ? pending
                    : unknown
                  : remaining !== null
                    ? t(
                        'ide.chat.context.remainingPercent',
                        { percent: remaining },
                        { defaultValue: '~{{percent}}% remaining' },
                      )
                    : percent === null
                      ? t('ide.chat.context.unmetered', undefined, { defaultValue: 'Unmetered' })
                      : unknown,
              ],
            ),
          ]),
          h('div', { class: cm.cn(cm.textMuted, cm.textSize('xs')) }, [allowanceNote]),
        ]),
      ])
    }
  },
})
