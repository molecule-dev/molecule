import type { ChatProvider } from '@molecule/app-ai-chat'

import type { ProviderProps } from './types.js'

/**
 * Props for the `ChatProvider` component.
 */
export interface ChatProviderProps extends ProviderProps {
  provider: ChatProvider
}
