import type { InjectionKey } from 'vue'

import type { ChatProvider } from '@molecule/app-ai-chat'

/**
 * Injection key for the AI chat provider.
 */
export const ChatKey: InjectionKey<ChatProvider> = Symbol('molecule-chat')
