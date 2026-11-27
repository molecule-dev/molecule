import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core'

import type { ChatProvider } from '@molecule/app-ai-chat'

import { CHAT_PROVIDER } from './chat-context.js'

/**
 * Registers the AI chat provider useChat and useChatProvider use.
 *
 * @param provider - Chat provider
 * @returns Environment providers
 */
export function provideChat(provider: ChatProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: CHAT_PROVIDER, useValue: provider }])
}
