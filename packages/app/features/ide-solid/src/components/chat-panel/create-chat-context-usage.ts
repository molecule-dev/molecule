/**
 * `chat:context-usage` — the context-usage ring's restored history and live
 * samples (React's `chat:context-usage` region and its one mount effect, ported
 * by unit P3).
 *
 * The restore runs once per conversation source: it reads the chat endpoint
 * the history load also uses, merges the stored samples into whatever the
 * stream has already reported, and retries a few times with backoff because a
 * transient failure at mount used to cost the ring for the whole session.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, onCleanup } from 'solid-js'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What the rest of the panel reads from `chat:context-usage`. */
export interface ChatContextUsageSlice {
  /** The usage sample the ring shows, or null before the first one. */
  contextUsage: Accessor<ContextUsage | null>
  /** Sets the usage sample (the stream and the restore both write it). */
  setContextUsage: Setter<ContextUsage | null>
  /** Every usage sample of the conversation, oldest first. */
  contextHistory: Accessor<ContextUsage[]>
  /** Sets the usage history. */
  setContextHistory: Setter<ContextUsage[]>
  /** The conversation's completed compactions. */
  contextCompactions: Accessor<ContextCompaction[]>
  /** Sets the compaction list. */
  setContextCompactions: Setter<ContextCompaction[]>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/** The restore endpoint's answer: the stored ring data of one conversation. */
interface ContextUsageRestore {
  /** The sample the ring shows. */
  contextUsage?: ContextUsage
  /** Every sample of the conversation. */
  contextHistory?: ContextUsage[]
  /** The conversation's completed compactions. */
  compactions?: ContextCompaction[]
}

/**
 * Creates `chat:context-usage`.
 * @param ctx - The inner ctx (its endpoint, conversation flag and HTTP client).
 * @returns The context-usage slice.
 */
export function createChatContextUsage(ctx: ChatInnerCtx): ChatContextUsageSlice {
  const [contextUsage, setContextUsage] = createSignal<ContextUsage | null>(null)
  const [contextHistory, setContextHistory] = createSignal<ContextUsage[]>([])
  const [contextCompactions, setContextCompactions] = createSignal<ContextCompaction[]>([])

  return {
    contextUsage,
    setContextUsage,
    contextHistory,
    setContextHistory,
    contextCompactions,
    setContextCompactions,
    effects: {
      // #effect chat:context-usage:1
      1: () => {
        // The conversation source this slice currently holds. React resets it
        // while rendering (`setContextSource` when a prop changed); Solid has no
        // render-phase set, so the effect below resets before it refetches —
        // same observable work, no request.
        let source = {
          endpoint: ctx.props.endpoint,
          hasConversation: ctx.env.hasConversation(),
          http: ctx.env.http,
        }
        createEffect(() => {
          const endpoint = ctx.props.endpoint
          const hasConversation = ctx.env.hasConversation()
          const http = ctx.env.http
          if (
            source.endpoint !== endpoint ||
            source.hasConversation !== hasConversation ||
            source.http !== http
          ) {
            source = { endpoint, hasConversation, http }
            setContextUsage(null)
            setContextHistory([])
            setContextCompactions([])
          }
          if (!hasConversation) return
          let cancelled = false
          let attempt = 0
          const load = (): void => {
            http
              .get<ContextUsageRestore>(endpoint)
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
          onCleanup(() => {
            cancelled = true
          })
        })
      },
    },
  }
}
