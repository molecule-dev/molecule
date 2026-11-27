import { createContext } from 'react'

import type { ChatProvider } from '@molecule/app-ai-chat'

/**
 * Context for AI chat provider.
 */
export const ChatContext = createContext<ChatProvider | null>(null)
ChatContext.displayName = 'MoleculeChatContext'
