/**
 * Vue plugin for molecule.dev framework bindings.
 *
 * @module
 */

import type { App, Plugin } from 'vue'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import {
  AuthKey,
  HttpKey,
  I18nKey,
  LoggerKey,
  RouterKey,
  StateKey,
  StorageKey,
  ThemeKey,
} from './injection-keys.js'

/**
 * Options for the molecule Vue plugin.
 */
export interface MoleculePluginOptions {
  state?: StateProvider
  auth?: AuthClient<unknown>
  theme?: ThemeProvider
  router?: Router
  i18n?: I18nProvider
  http?: HttpClient
  storage?: StorageProvider
  logger?: LoggerProvider
}

/**
 * Vue plugin that provides all molecule services.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { moleculePlugin } from '`@molecule/app-vue`'
 * import { provider as stateProvider } from '`@molecule/app-state-pinia`'
 *
 * const app = createApp(App)
 *
 * app.use(moleculePlugin, {
 *   state: stateProvider,
 *   auth: authClient,
 *   theme: themeProvider,
 * })
 *
 * app.mount('#app')
 * ```
 */
export const moleculePlugin: Plugin<MoleculePluginOptions> = {
  install(app: App, options: MoleculePluginOptions = {}) {
    const { state, auth, theme, router, i18n, http, storage, logger } = options

    if (state) {
      app.provide(StateKey, state)
    }

    if (auth) {
      app.provide(AuthKey, auth)
    }

    if (theme) {
      app.provide(ThemeKey, theme)
    }

    if (router) {
      app.provide(RouterKey, router)
    }

    if (i18n) {
      app.provide(I18nKey, i18n)
    }

    if (http) {
      app.provide(HttpKey, http)
    }

    if (storage) {
      app.provide(StorageKey, storage)
    }

    if (logger) {
      app.provide(LoggerKey, logger)
    }
  },
}

/**
 * Creates a Vue plugin that provides a state service via dependency injection.
 *
 * @param provider - The state provider to inject into the Vue application.
 * @returns A Vue plugin that provides the state service to all descendant components.
 */
export function createStatePlugin(provider: StateProvider): Plugin {
  return {
    install(app: App) {
      app.provide(StateKey, provider)
    },
  }
}

/**
 * Creates a Vue plugin that provides an auth service via dependency injection.
 * @param client - The auth client to inject into the Vue application.
 * @returns A Vue plugin that provides the auth client to all descendant components.
 */
export function createAuthPlugin<T>(client: AuthClient<T>): Plugin {
  return {
    install(app: App) {
      app.provide(AuthKey, client as AuthClient<unknown>)
    },
  }
}

/**
 * Creates a Vue plugin that provides a theme service via dependency injection.
 * @param provider - The theme provider to inject into the Vue application.
 * @returns A Vue plugin that provides the theme service to all descendant components.
 */
export function createThemePlugin(provider: ThemeProvider): Plugin {
  return {
    install(app: App) {
      app.provide(ThemeKey, provider)
    },
  }
}

/**
 * Creates a Vue plugin that provides a router service via dependency injection.
 * @param router - The router instance to inject into the Vue application.
 * @returns A Vue plugin that provides the router to all descendant components.
 */
export function createRouterPlugin(router: Router): Plugin {
  return {
    install(app: App) {
      app.provide(RouterKey, router)
    },
  }
}

/**
 * Creates a Vue plugin that provides an i18n service via dependency injection.
 * @param provider - The i18n provider to inject into the Vue application.
 * @returns A Vue plugin that provides the i18n service to all descendant components.
 */
export function createI18nPlugin(provider: I18nProvider): Plugin {
  return {
    install(app: App) {
      app.provide(I18nKey, provider)
    },
  }
}

/**
 * Creates a Vue plugin that provides an HTTP service via dependency injection.
 * @param client - The HTTP client to inject into the Vue application.
 * @returns A Vue plugin that provides the HTTP client to all descendant components.
 */
export function createHttpPlugin(client: HttpClient): Plugin {
  return {
    install(app: App) {
      app.provide(HttpKey, client)
    },
  }
}

/**
 * Creates a Vue plugin that provides a storage service via dependency injection.
 * @param provider - The storage provider to inject into the Vue application.
 * @returns A Vue plugin that provides the storage service to all descendant components.
 */
export function createStoragePlugin(provider: StorageProvider): Plugin {
  return {
    install(app: App) {
      app.provide(StorageKey, provider)
    },
  }
}

/**
 * Creates a Vue plugin that provides a logger service via dependency injection.
 * @param provider - The logger provider to inject into the Vue application.
 * @returns A Vue plugin that provides the logger service to all descendant components.
 */
export function createLoggerPlugin(provider: LoggerProvider): Plugin {
  return {
    install(app: App) {
      app.provide(LoggerKey, provider)
    },
  }
}
