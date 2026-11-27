import type { App, Plugin } from 'vue'

import type { ChatProvider } from '@molecule/app-ai-chat'

import { ChatKey } from './chat-context.js'

/**
 * Creates a Vue plugin that provides an AI chat provider via dependency injection.
 * @param provider - The chat provider to inject into the Vue application.
 * @returns A Vue plugin that provides the chat provider to all descendant components.
 */
export function createChatPlugin(provider: ChatProvider): Plugin {
  return {
    install(app: App) {
      app.provide(ChatKey, provider)
    },
  }
}
