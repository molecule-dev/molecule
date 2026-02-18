/**
 * React contexts for molecule.dev framework bindings.
 *
 * These contexts provide access to core molecule providers throughout
 * the React component tree.
 *
 * @module
 */

import { createContext } from 'react'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient } from '@molecule/app-auth'
import type { EditorProvider } from '@molecule/app-code-editor'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { WorkspaceProvider } from '@molecule/app-ide'
import type { PreviewProvider } from '@molecule/app-live-preview'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

/**
 * Context for state management provider.
 */
export const StateContext = createContext<StateProvider | null>(null)
StateContext.displayName = 'MoleculeStateContext'

/**
 * Context for authentication client.
 */
export const AuthContext = createContext<AuthClient<unknown> | null>(null)
AuthContext.displayName = 'MoleculeAuthContext'

/**
 * Context for theme provider.
 */
export const ThemeContext = createContext<ThemeProvider | null>(null)
ThemeContext.displayName = 'MoleculeThemeContext'

/**
 * Context for router.
 */
export const RouterContext = createContext<Router | null>(null)
RouterContext.displayName = 'MoleculeRouterContext'

/**
 * Context for internationalization provider.
 */
export const I18nContext = createContext<I18nProvider | null>(null)
I18nContext.displayName = 'MoleculeI18nContext'

/**
 * Context for HTTP client.
 */
export const HttpContext = createContext<HttpClient | null>(null)
HttpContext.displayName = 'MoleculeHttpContext'

/**
 * Context for storage provider.
 */
export const StorageContext = createContext<StorageProvider | null>(null)
StorageContext.displayName = 'MoleculeStorageContext'

/**
 * Context for logger provider.
 */
export const LoggerContext = createContext<LoggerProvider | null>(null)
LoggerContext.displayName = 'MoleculeLoggerContext'

/**
 * Context for AI chat provider.
 */
export const ChatContext = createContext<ChatProvider | null>(null)
ChatContext.displayName = 'MoleculeChatContext'

/**
 * Context for IDE workspace provider.
 */
export const WorkspaceContext = createContext<WorkspaceProvider | null>(null)
WorkspaceContext.displayName = 'MoleculeWorkspaceContext'

/**
 * Context for code editor provider.
 */
export const EditorContext = createContext<EditorProvider | null>(null)
EditorContext.displayName = 'MoleculeEditorContext'

/**
 * Context for live preview provider.
 */
export const PreviewContext = createContext<PreviewProvider | null>(null)
PreviewContext.displayName = 'MoleculePreviewContext'
