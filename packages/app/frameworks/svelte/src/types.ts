/**
 * Svelte-specific types for molecule.dev framework bindings.
 *
 * @module
 */

import type { Snippet } from 'svelte'
import type { Readable, Writable } from 'svelte/store'

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
import type { StateProvider, Store as MoleculeStore, StoreConfig } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Configuration for molecule Svelte context.
 */
export interface MoleculeConfig {
  state?: StateProvider
  auth?: AuthClient<unknown>
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
 * Props for the `SessionReady` component: its `children` snippet renders once
 * the auth client has decided the session, `fallback` until then.
 */
export interface SessionReadyProps {
  /** What renders once the initial restore settles — signed in, signed out, or unavailable. */
  children?: Snippet
  /** What renders while the session restore is still undecided; default nothing. */
  fallback?: Snippet
}

/**
 * State for async HTTP operations.
 */
export interface HttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * State for async storage values.
 */
export interface StorageValueState<T> {
  value: T | undefined
  loading: boolean
  error: Error | null
}

// Re-export core types for convenience
export type {
  AuthClient,
  AuthState,
  FormController,
  FormOptions,
  HttpClient,
  I18nProvider,
  Logger,
  LoggerProvider,
  MoleculeStore,
  QueryParams,
  Readable,
  RouteLocation,
  RouteParams,
  Router,
  StateProvider,
  StorageProvider,
  StoreConfig,
  Theme,
  ThemeProvider,
  Writable,
}
