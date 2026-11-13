/**
 * React hook for AI chat provider.
 *
 * The chat behavior — transcript, streaming, queueing, retries, page-lifecycle
 * recovery, pushed frames of turns running elsewhere — is `createChatSession`
 * from `@molecule/app-ai-chat`, shared by every framework binding. This module
 * adapts one session to React.
 *
 * @module
 */

import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import {
  convergeHistory as convergeChatHistory,
  createChatSession,
  localOnlyMessages as localOnlyChatMessages,
  resetChatStoresForTests as resetChatSessionStores,
} from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'

import { ChatContext } from '../contexts.js'
import type { UseChatOptions, UseChatResult } from '../types.js'

/**
 * Converge a live transcript on a fresh server history without rewinding
 * anything already on screen (the further-along copy of each message wins;
 * local-only messages are kept after the server's). Same function the chat
 * session uses for every history merge.
 *
 * @param prev - The current messages.
 * @param history - The messages from the server's history endpoint.
 * @returns The converged message list.
 */
export const convergeHistory: (prev: ChatMessage[], history: ChatMessage[]) => ChatMessage[] =
  convergeChatHistory

/**
 * The messages only the local transcript holds, given a server history:
 * optimistic bubbles and session-local cards, minus the optimistic echo of a
 * send the server already persisted.
 *
 * @param prev - The current messages.
 * @param history - The server's history.
 * @returns The local-only messages to keep after the merged history.
 */
export const localOnlyMessages: (prev: ChatMessage[], history: ChatMessage[]) => ChatMessage[] =
  localOnlyChatMessages

/**
 * Test-only: clear all conversation stores. The store is module-level (it must
 * outlive component mounts), so it persists across test cases — reset it in a
 * `beforeEach` the same way tests clear `sessionStorage`.
 */
export function resetChatStoresForTests(): void {
  resetChatSessionStores()
}

/**
 * Access the chat provider from context.
 * @returns The ChatProvider instance from the nearest ChatContext.
 * @throws {Error} If called outside a ChatProvider.
 */
export function useChatProvider(): ChatProvider {
  const provider = useContext(ChatContext)
  if (!provider) {
    throw new Error(
      t('react.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for AI chat with streaming support.
 *
 * Manages message state, sends messages to the backend, and handles
 * SSE streaming responses.
 *
 * @param options - Chat configuration including endpoint URL, project ID, and whether to load history on mount.
 * @returns Chat state and controls: messages, isLoading, error, sendMessage, abort, and clearHistory.
 */
export function useChat(options: UseChatOptions): UseChatResult {
  const provider = useChatProvider()
  const sessionOptions = { ...options, provider }
  const [session] = useState(() => createChatSession(sessionOptions))
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getServerState)
  // The latest props reach the session after every commit; a changed endpoint
  // is a conversation change, which the session loads.
  useEffect(() => {
    session.update(sessionOptions)
  })
  useEffect(() => session.connect(), [session])
  return useMemo(() => ({ ...state, ...session.controls }), [state, session])
}
