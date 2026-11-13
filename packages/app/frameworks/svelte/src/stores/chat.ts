/**
 * Svelte stores for AI chat, backed by the shared chat session of
 * `@molecule/app-ai-chat` (the same session React's `useChat` wraps).
 *
 * @module
 */

import { onDestroy, onMount } from 'svelte'
import { derived, get, type Readable, writable } from 'svelte/store'

import type {
  ChatSendOptions,
  ChatSessionControls,
  ChatSessionOptions,
  ChatSessionState,
} from '@molecule/app-ai-chat'
import {
  convergeHistory as coreConvergeHistory,
  createChatSession,
  localOnlyMessages as coreLocalOnlyMessages,
  resetChatStoresForTests as coreResetChatStoresForTests,
} from '@molecule/app-ai-chat'

import { useChatProvider } from '../context.js'

/** Options for {@link useChat} (the shared chat session's options). */
export type UseChatOptions = ChatSessionOptions

/** Options for one `sendMessage` call. */
export type SendMessageOptions = ChatSendOptions

/**
 * What {@link useChat} returns: each chat state field as a readable store,
 * and the session's controls as plain functions (stable for the component's life).
 */
export type UseChatResult = {
  readonly [K in keyof ChatSessionState]: Readable<ChatSessionState[K]>
} & ChatSessionControls

/**
 * Converges the local transcript with authoritative server history. See
 * `convergeHistory` in `@molecule/app-ai-chat`.
 *
 * @param prev - The local transcript.
 * @param history - The server's history.
 * @returns The converged transcript.
 */
export const convergeHistory: typeof coreConvergeHistory = coreConvergeHistory

/**
 * The local messages server history does not carry yet. See
 * `localOnlyMessages` in `@molecule/app-ai-chat`.
 *
 * @param prev - The local transcript.
 * @param history - The server's history.
 * @returns The local-only messages.
 */
export const localOnlyMessages: typeof coreLocalOnlyMessages = coreLocalOnlyMessages

/**
 * Clears every chat session store. Tests only: each test starts with no
 * transcript, queue or stream left by the previous one.
 */
export const resetChatStoresForTests: typeof coreResetChatStoresForTests =
  coreResetChatStoresForTests

/**
 * Whether a value is a readable store of options.
 *
 * @param value - Options or a store of them.
 * @returns True for a store.
 */
const isReadable = (
  value: UseChatOptions | Readable<UseChatOptions>,
): value is Readable<UseChatOptions> =>
  typeof (value as { subscribe?: unknown }).subscribe === 'function'

/**
 * AI chat with streaming: the transcript, loading and error state, mode, and
 * the controls (send, abort, queue edits, history). Call it during component
 * init.
 *
 * The options may be a readable store: a new `endpoint` switches conversation
 * and a new `projectId` moves to that project's transcript, on the same
 * component, the way React re-renders `useChat`.
 *
 * @param options - Chat options (or a store of them): endpoint, project id, history loading, callbacks.
 * @returns Each state field as a readable store, and the chat controls.
 * @example
 * ```svelte
 * <script>
 *   import { useChat } from '@molecule/app-svelte'
 *
 *   const chat = useChat({ endpoint: '/projects/p1/chat', projectId: 'p1' })
 *   const { messages, sendMessage } = chat
 * </script>
 *
 * {#each $messages as message}<p>{message.content}</p>{/each}
 * ```
 */
export function useChat(options: UseChatOptions | Readable<UseChatOptions>): UseChatResult {
  const provider = useChatProvider()
  let current = isReadable(options) ? get(options) : options
  const session = createChatSession({ ...current, provider })
  const state = writable(session.getState())
  const unsubscribe = session.subscribe(() => state.set(session.getState()))
  // New options reach the session as React's re-render does; a changed
  // endpoint is a conversation change, which the session loads. The store
  // calls back at once with the options the session was created with.
  let stopOptions: (() => void) | null = null
  if (isReadable(options)) {
    stopOptions = options.subscribe((next) => {
      if (next === current) return
      current = next
      session.update({ ...next, provider })
    })
  }
  onMount(() => session.connect())
  onDestroy(() => {
    stopOptions?.()
    unsubscribe()
  })
  const fields = Object.fromEntries(
    (Object.keys(session.getState()) as (keyof ChatSessionState)[]).map((key) => [
      key,
      derived(state, (current) => current[key]),
    ]),
  ) as { [K in keyof ChatSessionState]: Readable<ChatSessionState[K]> }
  return { ...fields, ...session.controls }
}
