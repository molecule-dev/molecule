/**
 * Angular functions for AI chat, backed by the shared chat session of
 * `@molecule/app-ai-chat` (the same session React's `useChat` wraps).
 *
 * @module
 */

import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  isSignal,
  type Signal,
  signal,
  untracked,
} from '@angular/core'

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

import { CHAT_PROVIDER } from './tokens.js'

/** Options for {@link useChat} (the shared chat session's options). */
export type UseChatOptions = ChatSessionOptions

/** Options for one `sendMessage` call. */
export type SendMessageOptions = ChatSendOptions

/**
 * What {@link useChat} returns: each chat state field as a signal, and the
 * session's controls as plain functions (stable for the component's life).
 */
export type UseChatResult = {
  readonly [K in keyof ChatSessionState]: Signal<ChatSessionState[K]>
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
 * The chat provider registered by `provideMolecule({ chat })` or `provideChat`.
 * Call it in an injection context.
 *
 * @returns The chat provider.
 * @throws {Error} When no chat provider is registered.
 */
export function useChatProvider(): ChatProvider {
  const provider = inject(CHAT_PROVIDER, { optional: true })
  if (!provider) {
    throw new Error(
      t('angular.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  }
  return provider
}

/**
 * AI chat with streaming: the transcript, loading and error state, mode, and
 * the controls (send, abort, queue edits, history). Call it in an injection
 * context (a component field initializer or constructor).
 *
 * The options may be a signal: a new `endpoint` switches conversation and a
 * new `projectId` moves to that project's transcript, on the same component,
 * the way React re-renders `useChat`.
 *
 * @param options - Chat options (or a signal of them): endpoint, project id, history loading, callbacks.
 * @returns Each state field as a signal, and the chat controls.
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-chat',
 *   template: `@for (message of chat.messages(); track message.id) { <p>{{ message.content }}</p> }`,
 * })
 * export class ChatComponent {
 *   readonly conversationId = input.required<string>()
 *   readonly chat = useChat(
 *     computed(() => ({
 *       endpoint: `/projects/p1/chat?conversationId=${this.conversationId()}`,
 *       projectId: 'p1',
 *     })),
 *   )
 * }
 * ```
 */
export function useChat(options: UseChatOptions | Signal<UseChatOptions>): UseChatResult {
  const provider = useChatProvider()
  let current = untracked(() => (isSignal(options) ? options() : options))
  const session = createChatSession({ ...current, provider })
  const state = signal(session.getState())
  const unsubscribe = session.subscribe(() => state.set(session.getState()))
  // New options reach the session as React's re-render does; a changed
  // endpoint is a conversation change, which the session loads.
  if (isSignal(options)) {
    effect(() => {
      const next = options()
      if (next === current) return
      current = next
      untracked(() => session.update({ ...next, provider }))
    })
  }
  let disconnect: (() => void) | null = null
  // Like React's effect, the session connects once the component has rendered
  // (and never during server rendering).
  afterNextRender(() => {
    disconnect = session.connect()
  })
  inject(DestroyRef).onDestroy(() => {
    unsubscribe()
    disconnect?.()
    disconnect = null
  })
  const fields = Object.fromEntries(
    (Object.keys(session.getState()) as (keyof ChatSessionState)[]).map((key) => [
      key,
      computed(() => state()[key]),
    ]),
  ) as { [K in keyof ChatSessionState]: Signal<ChatSessionState[K]> }
  return { ...fields, ...session.controls }
}
