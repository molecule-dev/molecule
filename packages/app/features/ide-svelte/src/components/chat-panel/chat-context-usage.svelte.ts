/**
 * React's `chat:context-usage` region of ChatPanel.tsx (lines 524–593): the
 * usage sample the ring shows, every sample of the conversation, the completed
 * compactions, and the mount restore that reads them from the history
 * endpoint in one `GET` and retries a transient failure three times.
 *
 * React resets the three lists while rendering when the conversation source
 * changes; here that reset runs at the top of the restore effect, before its
 * fetch, which is the same order for the request and the observable state.
 *
 * @module
 */

import { SvelteMap } from 'svelte/reactivity'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:context-usage` slice. */
export interface ChatContextUsageSlice {
  /** The usage sample the ring shows, or null before the first one. */
  readonly contextUsage: ContextUsage | null
  /** Sets the usage sample (the stream and the restore both write it). */
  readonly setContextUsage: ChatSetState<ContextUsage | null>
  /** Every usage sample of the conversation, oldest first. */
  readonly contextHistory: ContextUsage[]
  /** Sets the usage history. */
  readonly setContextHistory: ChatSetState<ContextUsage[]>
  /** The conversation's completed compactions. */
  readonly contextCompactions: ContextCompaction[]
  /** Sets the compaction list. */
  readonly setContextCompactions: ChatSetState<ContextCompaction[]>

  /** React's mount I/O for the region: none — it declares state and one effect. */
  mount(): void

  /** React's `#effect chat:context-usage:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/** The history endpoint's restore answer (React's inline response shape). */
interface ContextRestoreResponse {
  /** The latest usage sample the server holds. */
  contextUsage?: ContextUsage
  /** Every sample the server holds, oldest first. */
  contextHistory?: ContextUsage[]
  /** The conversation's completed compactions. */
  compactions?: ContextCompaction[]
}

/**
 * Creates the `chat:context-usage` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The usage state and the restore effect, at React's positions.
 */
export function createChatContextUsage(ctx: ChatContext): ChatContextUsageSlice {
  let contextUsage = $state.raw<ContextUsage | null>(null)
  let contextHistory = $state.raw<ContextUsage[]>([])
  let contextCompactions = $state.raw<ContextCompaction[]>([])
  // React's `contextSource` state: the conversation source the three lists
  // belong to. A different source starts with an empty ring, before the
  // restore below refetches for it.
  let contextSource = {
    endpoint: ctx.props.endpoint,
    hasConversation: ctx.env.hasConversation,
    http: ctx.env.http,
  }
  // The props this slice's effect depends on, through derived cells: the props
  // object invalidates as a whole when the host changes any prop, and a derived
  // re-notifies only when ITS value changed — React's `[endpoint,
  // hasConversation, http]` effect, not one re-run per unrelated prop.
  const liveEndpoint = $derived(ctx.props.endpoint)
  const liveHasConversation = $derived(ctx.env.hasConversation)

  /**
   * React's `setContextUsage`.
   *
   * @param value - The next sample, or an updater of the latest one.
   */
  const setContextUsage: ChatSetState<ContextUsage | null> = (value) => {
    contextUsage = resolveState(contextUsage, value)
  }
  /**
   * React's `setContextHistory`.
   *
   * @param value - The next history, or an updater of the latest one.
   */
  const setContextHistory: ChatSetState<ContextUsage[]> = (value) => {
    contextHistory = resolveState(contextHistory, value)
  }
  /**
   * React's `setContextCompactions`.
   *
   * @param value - The next compactions, or an updater of the latest ones.
   */
  const setContextCompactions: ChatSetState<ContextCompaction[]> = (value) => {
    contextCompactions = resolveState(contextCompactions, value)
  }

  return {
    get contextUsage(): ContextUsage | null {
      return contextUsage
    },
    setContextUsage,
    get contextHistory(): ContextUsage[] {
      return contextHistory
    },
    setContextHistory,
    get contextCompactions(): ContextCompaction[] {
      return contextCompactions
    },
    setContextCompactions,
    mount(): void {
      // React's region declares state and one effect; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          const endpoint = liveEndpoint
          const hasConversation = liveHasConversation
          const http = ctx.env.http
          // A different conversation source starts with an empty ring: reset
          // while rendering (React's pattern for state that follows a prop),
          // before the restore below refetches for it.
          if (
            contextSource.endpoint !== endpoint ||
            contextSource.hasConversation !== hasConversation ||
            contextSource.http !== http
          ) {
            contextSource = { endpoint, hasConversation, http }
            contextUsage = null
            contextHistory = []
            contextCompactions = []
          }
          if (!hasConversation) return
          let cancelled = false
          let attempt = 0
          /**
           * Reads the history endpoint once; a transient failure schedules the
           * next bounded attempt (4 s, 8 s, 12 s) and the fourth request is the
           * last — after that the next turn's `done` event repopulates the ring.
           */
          const load = (): void => {
            http
              .get<ContextRestoreResponse>(endpoint)
              .then((res) => {
                if (cancelled) return
                const restored = res.data.contextUsage
                if (restored)
                  setContextUsage((current) => {
                    if (!current) return restored
                    return mergeContextHistory([restored], [current]).at(-1) ?? current
                  })
                setContextHistory((current) =>
                  mergeContextHistory(res.data.contextHistory ?? [], current),
                )
                setContextCompactions((current) => {
                  const entries = new SvelteMap(
                    [...(res.data.compactions ?? []), ...current].map((entry) => [entry.at, entry]),
                  )
                  return [...entries.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-32)
                })
              })
              .catch((_error) => {
                // Transient failure — retry with backoff (bounded); after the
                // budget, the next turn's done event repopulates the ring.
                if (cancelled || attempt >= 3) return
                attempt++
                setTimeout(load, attempt * 4000)
              })
          }
          load()
          return () => {
            cancelled = true
          }
        })
      },
    },
  }
}
