import { ChatKey } from './chat-context.js'
import type { ChatProviderProps } from './chat-types.js'
import { serviceProvider } from './service-provider.js'

/**
 * Provider for AI chat, as `@molecule/app-react`'s `ChatProvider`.
 */
export const ChatProvider = serviceProvider<ChatProviderProps, 'provider'>(
  'ChatProvider',
  ChatKey,
  'provider',
)
