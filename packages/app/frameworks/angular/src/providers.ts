/**
 * Angular provider functions for molecule.dev.
 *
 * @module
 */

import type { EnvironmentProviders, Provider } from '@angular/core'
import {
  DestroyRef,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
} from '@angular/core'

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
import {
  getProvider as getStateProvider,
  hasProvider as hasStateProvider,
} from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import { bumpLocaleVersion } from './i18n-reactive.js'
import {
  AUTH_CLIENT,
  CHAT_PROVIDER,
  EDITOR_PROVIDER,
  HTTP_CLIENT,
  I18N_PROVIDER,
  LOGGER_PROVIDER,
  PREVIEW_PROVIDER,
  ROUTER,
  STATE_PROVIDER,
  STORAGE_PROVIDER,
  THEME_PROVIDER,
  WORKSPACE_PROVIDER,
} from './tokens.js'
import type { MoleculeModuleConfig } from './types.js'

/**
 * Provide state management.
 *
 * @param provider - State provider
 * @returns Environment providers
 */
export function provideState(provider: StateProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: STATE_PROVIDER, useValue: provider }])
}

/**
 * Registers an AuthClient as an Angular environment provider for dependency injection.
 *
 * @param client - Auth client
 * @returns Environment providers
 */
export function provideAuth<T>(client: AuthClient<T>): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: AUTH_CLIENT, useValue: client }])
}

/**
 * Registers a ThemeProvider as an Angular environment provider for dependency injection.
 *
 * @param provider - Theme provider
 * @returns Environment providers
 */
export function provideTheme(provider: ThemeProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: THEME_PROVIDER, useValue: provider }])
}

/**
 * Registers a Router as an Angular environment provider for dependency injection.
 *
 * @param router - Router instance
 * @returns Environment providers
 */
export function provideRouter(router: Router): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ROUTER, useValue: router }])
}

/**
 * Registers an I18nProvider as an Angular environment provider for dependency injection.
 *
 * @param provider - I18n provider
 * @returns Environment providers
 */
export function provideI18n(provider: I18nProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: I18N_PROVIDER, useValue: provider }])
}

/**
 * Provide HTTP client.
 *
 * @param client - HTTP client
 * @returns Environment providers
 */
export function provideHttp(client: HttpClient): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HTTP_CLIENT, useValue: client }])
}

/**
 * Registers a StorageProvider as an Angular environment provider for dependency injection.
 *
 * @param provider - Storage provider
 * @returns Environment providers
 */
export function provideStorage(provider: StorageProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: STORAGE_PROVIDER, useValue: provider }])
}

/**
 * Registers a LoggerProvider as an Angular environment provider for dependency injection.
 *
 * @param provider - Logger provider
 * @returns Environment providers
 */
export function provideLogger(provider: LoggerProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: LOGGER_PROVIDER, useValue: provider }])
}

/**
 * Registers the AI chat provider useChat and useChatProvider use.
 *
 * @param provider - Chat provider
 * @returns Environment providers
 */
export function provideChat(provider: ChatProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: CHAT_PROVIDER, useValue: provider }])
}

/**
 * Registers the IDE workspace provider useWorkspace and useWorkspaceProvider use.
 *
 * @param provider - Workspace provider
 * @returns Environment providers
 */
export function provideWorkspace(provider: WorkspaceProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: WORKSPACE_PROVIDER, useValue: provider }])
}

/**
 * Registers the code editor provider useEditor and useEditorProvider use.
 *
 * @param provider - Editor provider
 * @returns Environment providers
 */
export function provideEditor(provider: EditorProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: EDITOR_PROVIDER, useValue: provider }])
}

/**
 * Registers the live preview provider usePreview and usePreviewProvider use.
 *
 * @param provider - Preview provider
 * @returns Environment providers
 */
export function providePreview(provider: PreviewProvider): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PREVIEW_PROVIDER, useValue: provider }])
}

/**
 * Provide all molecule services at once.
 *
 * @param config - Configuration with all providers
 * @returns Environment providers
 *
 * @example
 * ```typescript
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideMolecule } from '@molecule/app-angular'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideMolecule({
 *       state: stateProvider,
 *       auth: authClient,
 *       theme: themeProvider,
 *     }),
 *   ],
 * })
 * ```
 */
export function provideMolecule(config: MoleculeModuleConfig): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = []

  // Like React's MoleculeProvider: fall back to the provider bonded under
  // `@molecule/app-state` (the singleton every `createStore()` reads), so a
  // scaffolded app needs no `state` option; an explicit `state` wins.
  const stateProvider = config.state ?? (hasStateProvider() ? getStateProvider() : undefined)
  if (stateProvider) {
    providers.push({ provide: STATE_PROVIDER, useValue: stateProvider })
  }
  if (config.auth) {
    providers.push({ provide: AUTH_CLIENT, useValue: config.auth })
  }
  if (config.theme) {
    providers.push({ provide: THEME_PROVIDER, useValue: config.theme })
  }
  if (config.router) {
    providers.push({ provide: ROUTER, useValue: config.router })
  }
  if (config.i18n) {
    providers.push({ provide: I18N_PROVIDER, useValue: config.i18n })
    // Bump the reactive locale signal on locale changes so that Angular
    // template bindings using the signal-aware `t()` from this package
    // automatically re-evaluate. No zone or tick hacks needed — signals
    // handle change detection scheduling natively. The listener ends with the
    // environment (the app), so a destroyed app leaves no subscription behind.
    const i18nProvider = config.i18n
    providers.push(
      provideEnvironmentInitializer(() => {
        const stop = i18nProvider.onLocaleChange(() => bumpLocaleVersion())
        inject(DestroyRef).onDestroy(stop)
      }),
    )
  }
  if (config.http) {
    providers.push({ provide: HTTP_CLIENT, useValue: config.http })
  }
  if (config.storage) {
    providers.push({ provide: STORAGE_PROVIDER, useValue: config.storage })
  }
  if (config.logger) {
    providers.push({ provide: LOGGER_PROVIDER, useValue: config.logger })
  }
  if (config.chat) {
    providers.push({ provide: CHAT_PROVIDER, useValue: config.chat })
  }
  if (config.workspace) {
    providers.push({ provide: WORKSPACE_PROVIDER, useValue: config.workspace })
  }
  if (config.editor) {
    providers.push({ provide: EDITOR_PROVIDER, useValue: config.editor })
  }
  if (config.preview) {
    providers.push({ provide: PREVIEW_PROVIDER, useValue: config.preview })
  }
  if (config.awaitSession && config.auth) {
    const client = config.auth
    providers.push(
      // The idiomatic hold: Angular creates no component (so no page renders) until
      // app initializers settle.
      provideAppInitializer(() => {
        // Start or join the one restore. A stored user can already be decided
        // while initialize()/whenRestored() still verify it in the background.
        const joined = client.initialize().catch((_error: unknown) => {
          // The client's status represents restore failure (including timeout).
          // Bootstrap renders 'unavailable' rather than rejecting on that failure.
        })
        if (client.getState().status !== 'loading') return

        let unsubscribe: (() => void) | undefined
        const ready = new Promise<void>((resolve) => {
          const check = (): void => {
            if (client.getState().status !== 'loading') resolve()
          }
          unsubscribe = client.onAuthChange(check)
          // Close the read/subscribe gap and include clients that settle only
          // their initialization promise rather than emitting a final change.
          check()
          void joined.then(check)
        })
        return ready.finally(() => unsubscribe?.())
      }),
    )
  }

  return makeEnvironmentProviders(providers)
}
