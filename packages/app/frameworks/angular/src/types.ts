/**
 * Angular-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, RouteLocation, RouteParams, Router } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Configuration for molecule Angular module.
 */
export interface MoleculeModuleConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
  /**
   * Hold bootstrap (and so every page's first render) until `auth` has decided the
   * session. After a full page load a returning visitor's session is restored by one
   * request, and until it answers `MoleculeAuthService.user` is `null` everywhere — a
   * public page's signed-in action (`if (!user) return`, a redirect to `/login`) then
   * treats a signed-in visitor as signed out. With this set, Angular's app initializer
   * waits only while status is `'loading'`, so a cached session can render while its
   * verification continues in the background. `'unavailable'` also renders and may have a
   * null user. Without a session hint, an anonymous visitor settles in microtasks without
   * a request. Ignored without `auth`.
   */
  awaitSession?: boolean
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  /** The AI chat provider useChat and useChatProvider use. */
  chat?: ChatProvider
  /** The IDE workspace provider useWorkspace and useWorkspaceProvider use. */
  workspace?: WorkspaceProvider
  /** The code editor provider useEditor and useEditorProvider use. */
  editor?: EditorProvider
  /** The live preview provider usePreview and usePreviewProvider use. */
  preview?: PreviewProvider
}

/**
 * Injection tokens for molecule services.
 */
export interface MoleculeTokens {
  STATE_PROVIDER: symbol
  AUTH_CLIENT: symbol
  THEME_PROVIDER: symbol
  ROUTER: symbol
  I18N_PROVIDER: symbol
  HTTP_CLIENT: symbol
  STORAGE_PROVIDER: symbol
  LOGGER_PROVIDER: symbol
  CHAT_PROVIDER: symbol
  WORKSPACE_PROVIDER: symbol
  EDITOR_PROVIDER: symbol
  PREVIEW_PROVIDER: symbol
}

// Re-export core types for convenience
export type {
  AuthClient,
  AuthState,
  EditorProvider,
  FormController,
  FormOptions,
  HttpClient,
  I18nProvider,
  Logger,
  LoggerProvider,
  PreviewProvider,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
  StateProvider,
  StorageProvider,
  Store,
  StoreConfig,
  Theme,
  ThemeProvider,
  WorkspaceProvider,
}
