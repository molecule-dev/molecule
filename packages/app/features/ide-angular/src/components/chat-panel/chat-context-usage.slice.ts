/**
 * React's `chat:context-usage` region of ChatPanel.tsx (lines 525–594): the
 * context-usage ring's state — the stored usage read back from the chat
 * endpoint, its history and the completed compactions — plus the resets a
 * conversation-source change performs.
 *
 * `#effect chat:context-usage:1` is the mount request: with a conversation open
 * it reads the endpoint once and retries a transient failure with a bounded
 * backoff (after the budget the next turn's `done` event repopulates the ring).
 * React also clears the ring while rendering when the conversation source
 * changes; this slice performs that reset on the same effect run, before the
 * restore it re-fires for the new source. The request runs on the first run of
 * the registered effect, which is where React's mount effect performs it, so it
 * keeps React's position ahead of the chat session's history load.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'

import { type ChatHttpClient, ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The conversation source the ring follows; a change starts from an empty ring. */
interface ContextSource {
  /** The chat endpoint the restore reads (it carries the conversation id). */
  endpoint: string
  /** Whether the endpoint names a conversation (no request without one). */
  hasConversation: boolean
  /** The HTTP client the request goes through. */
  http: ChatHttpClient
}

/** The identifiers other slices and sections read from the `chat:context-usage` slice. */
export interface ChatContextUsageSlice {
  /** React's mount I/O for the region (its request runs on the first effect run). */
  mount(): void

  /** React's `#effect chat:context-usage:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** The usage the ring shows (the latest sample, or the stored one). */
  readonly contextUsage: () => ContextUsage | null
  /** Sets the usage the ring shows. */
  readonly setContextUsage: ChatSetState<ContextUsage | null>
  /** Every usage sample of the conversation, oldest first. */
  readonly contextHistory: () => ContextUsage[]
  /** Sets the usage history. */
  readonly setContextHistory: ChatSetState<ContextUsage[]>
  /** The conversation's completed compactions. */
  readonly contextCompactions: () => ContextCompaction[]
  /** Sets the completed compactions. */
  readonly setContextCompactions: ChatSetState<ContextCompaction[]>
}

/** React's `chat:context-usage` slice: the stored usage and its restore. */
@Injectable()
export class ChatContextUsage implements ChatContextUsageSlice {
  /** The shared state, read for the endpoint and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the restore in. */
  private readonly injector = inject(Injector)

  /** Cancels a restore still running when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The usage the ring shows. */
  readonly contextUsage = signal<ContextUsage | null>(null)

  /** Every usage sample of the conversation, oldest first. */
  readonly contextHistory = signal<ContextUsage[]>([])

  /** The conversation's completed compactions. */
  readonly contextCompactions = signal<ContextCompaction[]>([])

  /** The endpoint React's restore reads (it carries the conversation id). */
  private readonly endpoint = computed(() => this.state.props().endpoint)

  /** Cancels the restore run in flight, the way React's effect cleanup does. */
  private cancelRestore: () => void = () => {}

  /** The source the ring currently follows (React's `contextSource` state). */
  private source: ContextSource | null = null

  /** React's mount I/O for the region: its request runs on the first effect run. */
  mount(): void {
    // `chat:context-usage` has no mount I/O outside its effect: the restore is
    // the effect's first run, which keeps React's request position.
  }

  /** Sets the usage the ring shows (value or updater). */
  readonly setContextUsage: ChatSetState<ContextUsage | null> = (next) => {
    this.contextUsage.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the usage history (value or updater). */
  readonly setContextHistory: ChatSetState<ContextUsage[]> = (next) => {
    this.contextHistory.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the completed compactions (value or updater). */
  readonly setContextCompactions: ChatSetState<ContextCompaction[]> = (next) => {
    this.contextCompactions.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Registers React's restore effect (its first run is the mount request). */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        const source: ContextSource = {
          endpoint: this.endpoint(),
          hasConversation: this.state.env.hasConversation(),
          http: this.state.env.http,
        }
        // React resets the ring while rendering when the conversation source
        // changes, before the effect below refetches for it.
        const previous = this.source
        if (
          previous === null ||
          previous.endpoint !== source.endpoint ||
          previous.hasConversation !== source.hasConversation ||
          previous.http !== source.http
        ) {
          this.source = source
          this.setContextUsage(null)
          this.setContextHistory([])
          this.setContextCompactions([])
        }
        this.cancelRestore()
        this.cancelRestore = this.restore(source)
      })
    },
  }

  /** Wires the unmount cleanup once, after the effect ledger is registered. */
  constructor() {
    this.destroyRef.onDestroy(() => this.cancelRestore())
  }

  /**
   * One run of React's restore effect. Reads the conversation's stored usage
   * and retries a transient failure up to three times, 4 s apart and rising.
   *
   * @param source - The conversation source this run follows.
   * @returns The cleanup that cancels the run (React's effect cleanup).
   */
  private restore(source: ContextSource): () => void {
    if (!source.hasConversation) return () => {}
    let cancelled = false
    let attempt = 0

    /**
     * Fetches the conversation's stored usage once.
     */
    const load = (): void => {
      source.http
        .get<{
          contextUsage?: ContextUsage
          contextHistory?: ContextUsage[]
          compactions?: ContextCompaction[]
        }>(source.endpoint)
        .then((res) => {
          if (cancelled) return
          const restored = res.data.contextUsage
          if (restored)
            this.setContextUsage((current) => {
              if (!current) return restored
              return mergeContextHistory([restored], [current]).at(-1) ?? current
            })
          this.setContextHistory((current) =>
            mergeContextHistory(res.data.contextHistory ?? [], current),
          )
          this.setContextCompactions((current) => {
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
}
