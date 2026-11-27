import { createContext } from 'solid-js'

import type { ChatProvider } from '@molecule/app-ai-chat'

/** Context for the provider used by the Solid chat primitives. */
export const ChatContext = createContext<ChatProvider>()
