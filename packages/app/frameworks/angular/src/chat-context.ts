import { InjectionToken } from '@angular/core'

import type { ChatProvider } from '@molecule/app-ai-chat'

/**
 * Injection token for the AI chat provider.
 */
export const CHAT_PROVIDER = new InjectionToken<ChatProvider>('molecule-chat-provider')
