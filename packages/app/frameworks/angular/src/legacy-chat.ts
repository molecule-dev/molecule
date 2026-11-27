import * as feature from './chat/index.js'

/**
 * Compatibility alias for `AgentIdentity`.
 * @deprecated Import AgentIdentity from `@molecule/app-ai-chat`.
 */
export type AgentIdentity = feature.AgentIdentity

/**
 * Compatibility alias for `CHAT_PROVIDER`.
 * @deprecated Import CHAT_PROVIDER from `@molecule/app-angular/chat`.
 */
export const CHAT_PROVIDER: typeof feature.CHAT_PROVIDER = feature.CHAT_PROVIDER

/**
 * Compatibility alias for `DEFAULT_AGENT_IDENTITY`.
 * @deprecated Import DEFAULT_AGENT_IDENTITY from `@molecule/app-ai-chat`.
 */
export const DEFAULT_AGENT_IDENTITY: typeof feature.DEFAULT_AGENT_IDENTITY =
  feature.DEFAULT_AGENT_IDENTITY

/**
 * Compatibility alias for `DEFAULT_AGENT_NAME`.
 * @deprecated Import DEFAULT_AGENT_NAME from `@molecule/app-ai-chat`.
 */
export const DEFAULT_AGENT_NAME: typeof feature.DEFAULT_AGENT_NAME = feature.DEFAULT_AGENT_NAME

/**
 * Compatibility alias for `DEFAULT_PRODUCT_NAME`.
 * @deprecated Import DEFAULT_PRODUCT_NAME from `@molecule/app-ai-chat`.
 */
export const DEFAULT_PRODUCT_NAME: typeof feature.DEFAULT_PRODUCT_NAME =
  feature.DEFAULT_PRODUCT_NAME

/**
 * Compatibility alias for `SendMessageOptions`.
 * @deprecated Import SendMessageOptions from `@molecule/app-angular/chat`.
 */
export type SendMessageOptions = feature.SendMessageOptions

/**
 * Compatibility alias for `UseChatOptions`.
 * @deprecated Import UseChatOptions from `@molecule/app-angular/chat`.
 */
export type UseChatOptions = feature.UseChatOptions

/**
 * Compatibility alias for `UseChatResult`.
 * @deprecated Import UseChatResult from `@molecule/app-angular/chat`.
 */
export type UseChatResult = feature.UseChatResult

/**
 * Compatibility alias for `convergeHistory`.
 * @deprecated Import convergeHistory from `@molecule/app-angular/chat`.
 */
export const convergeHistory: typeof feature.convergeHistory = feature.convergeHistory

/**
 * Compatibility alias for `localOnlyMessages`.
 * @deprecated Import localOnlyMessages from `@molecule/app-angular/chat`.
 */
export const localOnlyMessages: typeof feature.localOnlyMessages = feature.localOnlyMessages

/**
 * Compatibility alias for `provideChat`.
 * @deprecated Import provideChat from `@molecule/app-angular/chat`.
 */
export const provideChat: typeof feature.provideChat = feature.provideChat

/**
 * Compatibility alias for `resetChatStoresForTests`.
 * @deprecated Import resetChatStoresForTests from `@molecule/app-angular/chat`.
 */
export const resetChatStoresForTests: typeof feature.resetChatStoresForTests =
  feature.resetChatStoresForTests

/**
 * Compatibility alias for `useChat`.
 * @deprecated Import useChat from `@molecule/app-angular/chat`.
 */
export const useChat: typeof feature.useChat = feature.useChat

/**
 * Compatibility alias for `useChatProvider`.
 * @deprecated Import useChatProvider from `@molecule/app-angular/chat`.
 */
export const useChatProvider: typeof feature.useChatProvider = feature.useChatProvider
