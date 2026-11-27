import type * as React from 'react'

import { ChatContext } from './chat-context.js'
import type { ChatProviderProps } from './chat-types.js'

/**
 * Provider for AI chat.
 * @param props - Component props (see {@link ChatProviderProps}).
 * @returns The rendered chat provider element.
 */
export function ChatProvider({ provider, children }: ChatProviderProps): React.ReactElement {
  return <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
}
