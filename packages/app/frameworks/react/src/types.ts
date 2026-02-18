/**
 * React-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { EditorFile, EditorProvider, EditorTab } from '@molecule/app-code-editor'
import type { FormController, FormOptions } from '@molecule/app-forms'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { PanelId, WorkspaceLayout, WorkspaceProvider } from '@molecule/app-ide'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import type { QueryParams, Router, RouterConfig } from '@molecule/app-routing'
import type { StateProvider, Store, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Props for provider components.
 */
export interface ProviderProps {
  children: ReactNode
}

/**
 * Props for state provider component.
 */
export interface StateProviderProps extends ProviderProps {
  provider: StateProvider
}

/**
 * Props for auth provider component.
 */
export interface AuthProviderProps<T = unknown> extends ProviderProps {
  client: AuthClient<T>
}

/**
 * Props for theme provider component.
 */
export interface ThemeProviderProps extends ProviderProps {
  provider: ThemeProvider
  initialTheme?: string
}

/**
 * Props for router provider component.
 */
export interface RouterProviderProps extends ProviderProps {
  router: Router
}

/**
 * Props for i18n provider component.
 */
export interface I18nProviderProps extends ProviderProps {
  provider: I18nProvider
}

/**
 * Props for http provider component.
 */
export interface HttpProviderProps extends ProviderProps {
  client: HttpClient
}

/**
 * Props for storage provider component.
 */
export interface StorageProviderProps extends ProviderProps {
  provider: StorageProvider
}

/**
 * Props for logger provider component.
 */
export interface LoggerProviderProps extends ProviderProps {
  provider: LoggerProvider
}

/**
 * Props for the ChatProvider React component.
 */
export interface ChatProviderProps extends ProviderProps {
  provider: ChatProvider
}

/**
 * Props for workspace provider component.
 */
export interface WorkspaceProviderProps extends ProviderProps {
  provider: WorkspaceProvider
}

/**
 * Props for editor provider component.
 */
export interface EditorProviderProps extends ProviderProps {
  provider: EditorProvider
}

/**
 * Props for preview provider component.
 */
export interface PreviewProviderProps extends ProviderProps {
  provider: PreviewProvider
}

/**
 * Properties for molecule provider.
 */
export interface MoleculeProviderProps extends ProviderProps {
  state?: StateProvider
  auth?: AuthClient<unknown>
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
  chat?: ChatProvider
  workspace?: WorkspaceProvider
  editor?: EditorProvider
  preview?: PreviewProvider
}

/**
 * Hook options for useStore.
 */
export interface UseStoreOptions<T, S> {
  selector?: (state: T) => S
  equalityFn?: (a: S, b: S) => boolean
}

/**
 * Hook options for useAuth.
 */
export interface UseAuthOptions {
  /**
   * Whether to automatically refresh the token on mount.
   */
  autoRefresh?: boolean
}

/**
 * Hook result for useAuth.
 */
export interface UseAuthResult<T = unknown> {
  state: AuthState<T>
  login: AuthClient<T>['login']
  logout: AuthClient<T>['logout']
  register: AuthClient<T>['register']
  refresh: AuthClient<T>['refresh']
  isAuthenticated: boolean
  isLoading: boolean
  user: T | null
}

/**
 * Hook result for useTheme.
 */
export interface UseThemeResult {
  theme: Theme
  themeName: string
  setTheme: (name: string) => void
  toggleTheme: () => void
  mode: 'light' | 'dark'
}

/**
 * Hook result for useRouter.
 */
export interface UseRouterResult {
  location: Router['getLocation'] extends () => infer R ? R : never
  params: Record<string, string>
  query: QueryParams
  navigate: Router['navigate']
  navigateTo: Router['navigateTo']
  back: Router['back']
  forward: Router['forward']
  isActive: Router['isActive']
}

/**
 * Hook result for useTranslation.
 */
export interface UseTranslationResult {
  t: I18nProvider['t']
  locale: string
  setLocale: I18nProvider['setLocale']
  locales: ReturnType<I18nProvider['getLocales']>
  formatNumber: I18nProvider['formatNumber']
  formatDate: I18nProvider['formatDate']
  direction: 'ltr' | 'rtl'
}

/**
 * Hook options for useChat.
 */
export interface UseChatOptions {
  /** Chat endpoint (e.g., '/projects/123/chat'). */
  endpoint: string
  /** Project ID for context. */
  projectId?: string
  /** Load history on mount. */
  loadOnMount?: boolean
}

/**
 * Hook result for useChat.
 */
export interface UseChatResult {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  abort: () => void
  clearHistory: () => Promise<void>
}

/**
 * Hook result for useWorkspace.
 */
export interface UseWorkspaceResult {
  layout: WorkspaceLayout
  activePanel: PanelId | null
  collapsedPanels: Set<PanelId>
  togglePanel: (panelId: PanelId) => void
  resizePanel: (panelId: PanelId, size: number) => void
  setActivePanel: (panelId: PanelId) => void
  resetLayout: () => void
}

/**
 * Hook result for useEditor.
 */
export interface UseEditorResult {
  tabs: EditorTab[]
  activeFile: string | null
  openFile: (file: EditorFile) => void
  closeFile: (path: string) => void
  getContent: () => string | null
  setContent: (path: string, content: string) => void
  setActiveTab: (path: string) => void
  mount: EditorProvider['mount']
  dispose: () => void
  focus: () => void
}

/**
 * Hook result for usePreview.
 */
export interface UsePreviewResult {
  state: PreviewState
  setUrl: (url: string) => void
  refresh: () => void
  setDevice: (device: DeviceFrame) => void
  openExternal: () => void
}

// Re-export core types for convenience
// Note: I18nProvider, LoggerProvider, StateProvider, StorageProvider, and ThemeProvider
// are not re-exported here because providers.tsx exports React components with the same names.
// Import these types directly from their respective packages instead.
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  HttpClient,
  Router,
  RouterConfig,
  Store,
  StoreConfig,
  Theme,
}
