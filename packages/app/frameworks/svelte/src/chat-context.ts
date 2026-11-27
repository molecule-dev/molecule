import { getContext, setContext } from 'svelte'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'

const CHAT_KEY = Symbol('molecule-chat')

/**
 * Sets the AI chat context.
 * @param provider - The chat provider to store in Svelte context.
 */
export function setChatContext(provider: ChatProvider): void {
  setContext(CHAT_KEY, provider)
}

/**
 * Gets the AI chat provider from Svelte context (`setMoleculeContext({ chat })`).
 * @returns The chat provider instance.
 * @throws {Error} If no chat provider has been set in context.
 */
export function useChatProvider(): ChatProvider {
  const provider = getContext<ChatProvider | undefined>(CHAT_KEY)
  if (!provider)
    throw new Error(
      t('svelte.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  return provider
}
