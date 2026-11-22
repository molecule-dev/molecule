/**
 * `chat:context-usage` — the context-usage ring's state: the stored usage read
 * from the chat endpoint, its history and the completed compactions, plus the
 * live samples the stream feeds it.
 *
 * The restore is React's `#effect chat:context-usage:1`: on mount (and again
 * when the conversation source changes) it reads the endpoint, retries a
 * transient failure with a bounded backoff, and merges what it reads with the
 * samples already in memory. A source change starts from an empty ring first,
 * exactly as React resets while rendering.
 *
 * @module
 */

import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, SetState } from './context.js'

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** What the `chat:context-usage` slice exposes. */
export interface ChatContextUsageSlice {
  /** The usage the ring shows (the latest sample, or the stored one). */
  readonly contextUsage: Ref<ContextUsage | null>
  /** Sets the usage the ring shows. */
  readonly setContextUsage: SetState<ContextUsage | null>
  /** Every usage sample of the conversation, oldest first. */
  readonly contextHistory: Ref<ContextUsage[]>
  /** Sets the usage history. */
  readonly setContextHistory: SetState<ContextUsage[]>
  /** The conversation's completed compactions. */
  readonly contextCompactions: Ref<ContextCompaction[]>
  /** Sets the completed compactions. */
  readonly setContextCompactions: SetState<ContextCompaction[]>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:context-usage:1` — the conversation's stored usage restore. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:context-usage` slice.
 *
 * @param ctx - The panel context (the endpoint, the HTTP client, the conversation id).
 * @returns The context-usage slice.
 */
export function createChatContextUsage(ctx: ChatCtx): ChatContextUsageSlice {
  const contextUsage = ref<ContextUsage | null>(null)
  const setContextUsage = makeSetter(contextUsage)
  const contextHistory = ref<ContextUsage[]>([])
  const setContextHistory = makeSetter(contextHistory)
  const contextCompactions = ref<ContextCompaction[]>([])
  const setContextCompactions = makeSetter(contextCompactions)

  /**
   * One run of React's restore effect. Reads the conversation's stored usage
   * and retries a transient failure up to three times, 4 s apart and rising.
   *
   * @returns The cleanup that cancels the run (React's effect cleanup).
   */
  const restore = (): (() => void) => {
    if (!ctx.env.hasConversation.value) return () => {}
    let cancelled = false
    let attempt = 0
    const load = (): void => {
      ctx.env.http
        .get<{
          contextUsage?: ContextUsage
          contextHistory?: ContextUsage[]
          compactions?: ContextCompaction[]
        }>(ctx.props.endpoint)
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
            const entries = new Map(
              [...(res.data.compactions ?? []), ...current].map((entry) => [entry.at, entry]),
            )
            return [...entries.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-32)
          })
        })
        .catch((_error) => {
          // Transient failure — retry with backoff (bounded); after the budget,
          // the next turn's done event repopulates the ring.
          if (cancelled || attempt >= 3) return
          attempt++
          setTimeout(load, attempt * 4000)
        })
    }
    load()
    return () => {
      cancelled = true
    }
  }

  return {
    contextUsage,
    setContextUsage,
    contextHistory,
    setContextHistory,
    contextCompactions,
    setContextCompactions,
    effects: {
      1: () => {
        // React resets the ring while rendering when the conversation source
        // changes; in Vue the watcher clears it when the source differs.
        let source = {
          endpoint: ctx.props.endpoint,
          hasConversation: ctx.env.hasConversation.value,
          http: ctx.env.http,
        }
        let cancel = (): void => {}
        onMounted(() => {
          cancel = restore()
        })
        watch(
          [() => ctx.props.endpoint, () => ctx.env.hasConversation.value, () => ctx.env.http],
          () => {
            const next = {
              endpoint: ctx.props.endpoint,
              hasConversation: ctx.env.hasConversation.value,
              http: ctx.env.http,
            }
            if (
              next.endpoint !== source.endpoint ||
              next.hasConversation !== source.hasConversation ||
              next.http !== source.http
            ) {
              source = next
              setContextUsage(null)
              setContextHistory([])
              setContextCompactions([])
            }
            cancel()
            cancel = restore()
            // React's effect order after a conversation change: this restore, then
            // `useChat`'s history load, then the activity-card restore. Both this
            // watcher and the chat session's own are pre-flush, and this one is
            // registered first, so the GET is issued before the load. The source
            // it records is what the LATER watchers follow, which puts their work
            // after the load — React's hook order.
            ctx.chat.noteConversationSource()
          },
        )
        onUnmounted(() => {
          cancel()
        })
      },
    },
  }
}
