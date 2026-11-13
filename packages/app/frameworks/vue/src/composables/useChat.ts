/**
 * Vue composables for AI chat, backed by the shared chat session of
 * `@molecule/app-ai-chat` (the same session React's `useChat` wraps).
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  inject,
  type MaybeRefOrGetter,
  onMounted,
  onUnmounted,
  shallowRef,
  toValue,
  watch,
} from 'vue'

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

import { ChatKey } from '../injection-keys.js'

/** Options for {@link useChat} (the shared chat session's options). */
export type UseChatOptions = ChatSessionOptions

/** Options for one `sendMessage` call. */
export type SendMessageOptions = ChatSendOptions

/**
 * What {@link useChat} returns: each chat state field as a computed ref, and
 * the session's controls as plain functions (stable for the composable's life).
 */
export type UseChatResult = {
  readonly [K in keyof ChatSessionState]: ComputedRef<ChatSessionState[K]>
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
 * The chat provider installed by `moleculePlugin` (`chat`).
 *
 * @returns The chat provider.
 * @throws {Error} When the plugin was installed without `chat`.
 */
export function useChatProvider(): ChatProvider {
  const provider = inject(ChatKey, null)
  if (!provider) {
    throw new Error(
      t('vue.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  }
  return provider
}

/**
 * AI chat with streaming: the transcript, loading and error state, mode, and
 * the controls (send, abort, queue edits, history). Call it in `setup`.
 *
 * The options may be reactive (a ref or a getter): a new `endpoint` switches
 * conversation and a new `projectId` moves to that project's transcript, on
 * the same component, the way React re-renders `useChat`.
 *
 * @param options - Chat options: endpoint, project id, history loading, callbacks.
 * @returns Each state field as a computed ref, and the chat controls.
 * @example
 * ```vue
 * <script setup>
 * import { computed } from 'vue'
 * import { useChat } from '@molecule/app-vue'
 *
 * const props = defineProps<{ conversationId: string }>()
 * const { messages, isLoading, sendMessage } = useChat(() => ({
 *   endpoint: `/projects/p1/chat?conversationId=${props.conversationId}`,
 *   projectId: 'p1',
 * }))
 * </script>
 * ```
 */
export function useChat(options: MaybeRefOrGetter<UseChatOptions>): UseChatResult {
  const provider = useChatProvider()
  const session = createChatSession({ ...toValue(options), provider })
  const state = shallowRef(session.getState())
  const unsubscribe = session.subscribe(() => {
    state.value = session.getState()
  })
  // New options reach the session as React's re-render does; a changed
  // endpoint is a conversation change, which the session loads.
  watch(
    () => toValue(options),
    (next) => session.update({ ...next, provider }),
    { deep: true },
  )
  let disconnect: (() => void) | null = null
  onMounted(() => {
    disconnect = session.connect()
  })
  onUnmounted(() => {
    unsubscribe()
    disconnect?.()
    disconnect = null
  })
  const fields = Object.fromEntries(
    (Object.keys(state.value) as (keyof ChatSessionState)[]).map((key) => [
      key,
      computed(() => state.value[key]),
    ]),
  ) as { [K in keyof ChatSessionState]: ComputedRef<ChatSessionState[K]> }
  return { ...fields, ...session.controls }
}
