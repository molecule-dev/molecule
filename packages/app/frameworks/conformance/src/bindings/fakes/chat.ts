/**
 * Binding-case fakes for one area: the chat provider and its streams for useChat and useChatProvider.
 *
 * A case seeds this area through `context.areas.chat`; `control` steps call
 * the controls registered here (named `chat.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * Determinism: `useChat` stamps every local user message with `Date.now()` and
 * `crypto.randomUUID()`. The factory pins the clock at the epoch (restored in
 * `dispose`), and the kit counts `randomUUID` for every case
 * (`installRandomSources`), so the React recording and every later framework run
 * see identical ids and timestamps. The clock pin is why a chat case may use
 * `advance` steps without wall-clock time leaking into snapshots.
 *
 * @module
 */

import { vi } from 'vitest'

import type {
  ChatAttachment,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
} from '@molecule/app-ai-chat'

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.chat`). */
export interface ChatSeed {
  /** Each `loadHistory` call answers the next list (deep-copied); the last repeats. Default: one empty list. */
  readonly history?: readonly ChatMessage[][]
  /**
   * `provider.isServerStreaming` after each `loadHistory` call (last repeats; default `false`).
   * A case that drives a turn through pushed frames sets the server's state with the
   * `chat.serverStreaming` control instead: a set value answers every later load, as a real
   * server reports a live turn until it ends.
   */
  readonly serverStreaming?: readonly boolean[]
  /** `provider.lastMeta` after each `loadHistory` call (last repeats; default `null`). */
  readonly meta?: readonly Record<string, unknown>[]
  /** Every `loadHistory` rejects with `new Error(message)` instead of answering. */
  readonly historyError?: string
  /** Provide `queueMessage`/`editQueuedMessage`/`deleteQueuedMessage` (durable provider queue). */
  readonly durable?: boolean
  /** Provide `sendSideMessage`, so `sideChannel` sends take the independent request path. */
  readonly sideChannel?: boolean
}

/** One provider call whose response stream the case drives through controls. */
interface OpenCall {
  /** Which provider method opened it (`sendMessage`, `queueMessage`, `sendSideMessage`). */
  kind: 'send' | 'queue' | 'side'
  /** The stream's event handler; dead once the call settled (a closed stream delivers nothing). */
  onEvent: ChatEventHandler
  /** Settles the call's promise; guarded so it can only happen once. */
  settle: (error?: Error) => void
  settled: boolean
}

/**
 * Builds this area's fakes for one case.
 *
 * @param context - The case context (`context.areas?.chat` is this area's seed).
 * @param record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup; nothing when the case does not seed chat.
 */
export const createChatFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.chat
  if (!seed) return {}

  // ── Deterministic time ──────────────────────────────────────────────────────
  // Pin the system clock at the epoch: the hook stamps local messages with
  // `Date.now()`, and fake timers installed later (run.ts) inherit this start
  // time, so timestamps are `0` in every framework and every recording.
  vi.setSystemTime(0)

  // ── Scripted server state ───────────────────────────────────────────────────
  const histories = (seed.history ?? [[]]).map((list) => list)
  let loadCount = 0
  // Set by the `chat.serverStreaming` control; once set, it answers every later load.
  let serverStreaming: boolean | undefined
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  // ── Open (pending) provider calls ───────────────────────────────────────────
  const open: OpenCall[] = []
  const register = (kind: OpenCall['kind'], onEvent: ChatEventHandler): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const call: OpenCall = {
        kind,
        onEvent,
        settled: false,
        settle: (error?: Error) => {
          if (call.settled) return
          call.settled = true
          if (error) reject(error)
          else resolve()
        },
      }
      open.push(call)
    })
  const oldest = (kind: OpenCall['kind']): OpenCall => {
    const call = open.find((c) => c.kind === kind && !c.settled)
    if (!call)
      throw new Error(`conformance: chat.${kind} has no open call to drive (finish it first?)`)
    return call
  }
  const emit = (kind: OpenCall['kind'], event: unknown): void => {
    oldest(kind).onEvent(event as never)
  }
  const finish = (kind: OpenCall['kind']): void => {
    oldest(kind).settle()
  }
  const fail = (kind: OpenCall['kind'], message: string): void => {
    oldest(kind).settle(new Error(message))
  }

  // ── The provider ────────────────────────────────────────────────────────────
  const provider = {
    name: 'conformance-chat',
    /** What the last history load reported; the hook reads it after `loadHistory`. */
    isServerStreaming: false as boolean,
    lastMeta: null as Record<string, unknown> | null,
    sendMessage(
      message: string,
      config: ChatConfig,
      onEvent: ChatEventHandler,
      attachments?: ChatAttachment[],
    ): Promise<void> {
      record('chat.sendMessage', attachments ? [message, config, attachments] : [message, config])
      return register('send', onEvent)
    },
    abort(): void {
      record('chat.abort', [])
      // The real provider swallows its own AbortError, so an aborted send
      // RESOLVES (failures arrive as `error` events, not rejections).
      for (const call of open) if (call.kind === 'send' && !call.settled) call.settle()
    },
    abortOnServer(
      config: ChatConfig,
      conversationId?: string,
      opts?: { userInitiated?: boolean },
    ): void {
      record('chat.abortOnServer', [config, conversationId, opts])
    },
    async loadHistory(config: ChatConfig): Promise<ChatMessage[]> {
      record('chat.loadHistory', [config])
      if (seed.historyError) throw new Error(seed.historyError)
      const index = Math.min(loadCount, histories.length - 1)
      // history, serverStreaming and meta are each scripted per load, so each
      // list advances on its own counter (a one-entry history must not pin the
      // streaming flag to its first value).
      const load = loadCount++
      provider.isServerStreaming =
        serverStreaming ??
        (seed.serverStreaming
          ? (seed.serverStreaming[Math.min(load, seed.serverStreaming.length - 1)] ?? false)
          : false)
      provider.lastMeta = seed.meta
        ? clone(seed.meta[Math.min(load, seed.meta.length - 1)] ?? null)
        : null
      return clone(histories[index] ?? [])
    },
    async clearHistory(config: ChatConfig): Promise<void> {
      record('chat.clearHistory', [config])
    },
    ...(seed.durable
      ? {
          queueMessage(
            message: string,
            config: ChatConfig,
            onEvent: ChatEventHandler,
            _attachments?: ChatAttachment[],
            messageId?: string,
          ): Promise<void> {
            record('chat.queueMessage', [message, config, messageId])
            return register('queue', onEvent)
          },
          async editQueuedMessage(
            messageId: string,
            message: string,
            config: ChatConfig,
          ): Promise<void> {
            record('chat.editQueuedMessage', [messageId, message, config])
          },
          async deleteQueuedMessage(messageId: string, config: ChatConfig): Promise<void> {
            record('chat.deleteQueuedMessage', [messageId, config])
          },
        }
      : {}),
    ...(seed.sideChannel
      ? {
          sendSideMessage(
            message: string,
            config: ChatConfig,
            onEvent: ChatEventHandler,
          ): Promise<void> {
            record('chat.sendSideMessage', [message, config])
            return register('side', onEvent)
          },
        }
      : {}),
  } satisfies ChatProvider & {
    isServerStreaming?: boolean
    lastMeta?: Record<string, unknown> | null
    abortOnServer?: (
      config: ChatConfig,
      conversationId?: string,
      opts?: { userInitiated?: boolean },
    ) => void
  }

  return {
    services: { chat: provider as ChatProvider },
    controls: {
      /** Deliver one stream event to the oldest open `sendMessage` stream. */
      'chat.emit': (...args: unknown[]) => emit('send', args[0]),
      /** End the oldest open `sendMessage` stream cleanly (its promise resolves). */
      'chat.finish': () => finish('send'),
      /** Make the oldest open `sendMessage` stream's promise reject with `Error(message)`. */
      'chat.fail': (...args: unknown[]) => fail('send', args[0] as string),
      /** Deliver one event to the oldest open `queueMessage` call. */
      'chat.queueEmit': (...args: unknown[]) => emit('queue', args[0]),
      /** Accept the oldest open `queueMessage` call (its promise resolves). */
      'chat.queueAccept': () => finish('queue'),
      /** Make the oldest open `queueMessage` call reject with `Error(message)`. */
      'chat.queueFail': (...args: unknown[]) => fail('queue', args[0] as string),
      /** Deliver one event to the oldest open `sendSideMessage` call. */
      'chat.sideEmit': (...args: unknown[]) => emit('side', args[0]),
      /** End the oldest open `sendSideMessage` call (its promise resolves). */
      'chat.sideFinish': () => finish('side'),
      /** Make the oldest open `sendSideMessage` call reject with `Error(message)`. */
      'chat.sideFail': (...args: unknown[]) => fail('side', args[0] as string),
      /**
       * Set whether the server has a live turn: the provider's `isServerStreaming` flag now and
       * after every later history load, until set again (it replaces the seed's per-load script).
       */
      'chat.serverStreaming': (...args: unknown[]) => {
        serverStreaming = args[0] === true
        provider.isServerStreaming = serverStreaming
      },
      /** Fire `beforeunload` on the window (the page-unload path). */
      'chat.pageUnload': () => {
        window.dispatchEvent(new Event('beforeunload'))
      },
    },
    listeners: () => ({ 'chat.openStreams': open.filter((call) => !call.settled).length }),
    dispose: () => {
      // Release every stream the case left open and restore the clock.
      for (const call of open) if (!call.settled) call.settle()
      vi.useRealTimers()
    },
  }
}
