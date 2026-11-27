import type { JSX } from 'solid-js'

import { ChatContext } from './chat-context.js'
import type { ChatProviderProps } from './chat-types.js'
import { serviceProvider } from './service-provider.js'

/**
 * Provider for AI chat, as `@molecule/app-react`'s `ChatProvider`.
 *
 * @param props - Component props (see {@link ChatProviderProps}).
 * @returns The provided tree.
 */
export function ChatProvider(props: ChatProviderProps): JSX.Element {
  return serviceProvider(
    ChatContext,
    () => props.provider,
    () => props.children,
  )
}
