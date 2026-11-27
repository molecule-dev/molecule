import type {
  ChatProvider,
  ChatSendOptions,
  ChatSessionControls,
  ChatSessionOptions,
  ChatSessionState,
} from '@molecule/app-ai-chat'

import type { ProviderProps } from './types.js'

/**
 * Props for the ChatProvider React component.
 */
export interface ChatProviderProps extends ProviderProps {
  provider: ChatProvider
}

/**
 * Hook options for useChat: the chat session options (see `createChatSession`
 * in `@molecule/app-ai-chat`).
 */
export type UseChatOptions = ChatSessionOptions

/**
 * Options for {@link UseChatResult.sendMessage}.
 */
export type SendMessageOptions = ChatSendOptions

/**
 * Hook result for useChat: the chat session's state plus its controls.
 */
export type UseChatResult = ChatSessionState & ChatSessionControls
