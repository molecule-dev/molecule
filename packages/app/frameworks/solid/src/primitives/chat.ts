/**
 * Solid primitives for AI chat, backed by the shared chat session of
 * `@molecule/app-ai-chat` (the same session React's `useChat` wraps).
 *
 * @module
 */

import {
  type Accessor,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  untrack,
  useContext,
} from 'solid-js'

import type {
  ChatProvider,
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
import { t } from '@molecule/app-i18n'

import { ChatContext } from '../context.js'

/** Options for {@link useChat} (the shared chat session's options). */
export type UseChatOptions = ChatSessionOptions

/** Options for one `sendMessage` call. */
export type SendMessageOptions = ChatSendOptions

/**
 * What {@link useChat} returns: each chat state field as an accessor, and the
 * session's controls as plain functions (stable for the component's life).
 */
export type UseChatResult = {
  readonly [K in keyof ChatSessionState]: Accessor<ChatSessionState[K]>
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
 * The chat provider from the nearest `MoleculeProvider` (`config.chat`).
 *
 * @returns The chat provider.
 * @throws {Error} When no `MoleculeProvider` above configures `chat`.
 */
export function useChatProvider(): ChatProvider {
  const provider = useContext(ChatContext)
  if (!provider) {
    throw new Error(
      t('solid.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  }
  return provider
}

/**
 * AI chat with streaming: the transcript, loading and error state, mode, and
 * the controls (send, abort, queue edits, history). Call it in a component.
 *
 * The options may be an accessor: a new `endpoint` switches conversation and
 * a new `projectId` moves to that project's transcript, on the same
 * component, the way React re-renders `useChat`.
 *
 * @param options - Chat options (or an accessor of them): endpoint, project id, history loading, callbacks.
 * @returns Each state field as an accessor, and the chat controls.
 * @example
 * ```tsx
 * import { useChat } from '@molecule/app-solid'
 *
 * function Chat(props: { conversationId: string }) {
 *   const chat = useChat(() => ({
 *     endpoint: `/projects/p1/chat?conversationId=${props.conversationId}`,
 *     projectId: 'p1',
 *   }))
 *   return <For each={chat.messages()}>{(message) => <p>{message.content}</p>}</For>
 * }
 * ```
 */
export function useChat(options: UseChatOptions | Accessor<UseChatOptions>): UseChatResult {
  const provider = useChatProvider()
  const read = (): UseChatOptions => (typeof options === 'function' ? options() : options)
  const session = createChatSession({ ...untrack(read), provider })
  const [state, setState] = createSignal(session.getState())
  const unsubscribe = session.subscribe(() => setState(session.getState()))
  // New options reach the session as React's re-render does; a changed
  // endpoint is a conversation change, which the session loads.
  if (typeof options === 'function') {
    createEffect(on(options, (next) => session.update({ ...next, provider }), { defer: true }))
  }
  let disconnect: (() => void) | null = null
  onMount(() => {
    disconnect = session.connect()
  })
  onCleanup(() => {
    unsubscribe()
    disconnect?.()
    disconnect = null
  })
  const fields = Object.fromEntries(
    (Object.keys(state()) as (keyof ChatSessionState)[]).map((key) => [key, () => state()[key]]),
  ) as { [K in keyof ChatSessionState]: Accessor<ChatSessionState[K]> }
  return { ...fields, ...session.controls }
}
