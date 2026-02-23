/**
 * Angular provider functions for molecule.dev.
 *
 * @module
 */

import type { EnvironmentProviders, Provider } from '@angular/core'
import { ENVIRONMENT_INITIALIZER, makeEnvironmentProviders } from '@angular/core'

import type { AuthClient } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import type { I18nProvider } from '@molecule/app-i18n'
import type { LoggerProvider } from '@molecule/app-logger'
import type { Router } from '@molecule/app-routing'
import type { StateProvider } from '@molecule/app-state'
import type { StorageProvider } from '@molecule/app-storage'
import type { ThemeProvider } from '@molecule/app-theme'

import { bumpLocaleVersion } from './i18n-reactive.js'
import {
  AUTH_CLIENT,
  HTTP_CLIENT,
  I18N_PROVIDER,
  LOGGER_PROVIDER,
  ROUTER,
  STATE_PROVIDER,
  STORAGE_PROVIDER,
  THEME_PROVIDER,
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
 * Provide all molecule services at once.
 *
 * @param config - Configuration with all providers
 * @returns Environment providers
 *
 * @example
 * ```typescript
 * import { bootstrapApplication } from '@angular/platform-browser'
 * import { provideMolecule } from '`@molecule/app-angular`'
 * import { provider as stateProvider } from '`@molecule/app-state-ngrx`'
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
  const providers: Provider[] = []

  if (config.state) {
    providers.push({ provide: STATE_PROVIDER, useValue: config.state })
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
    // handle change detection scheduling natively.
    const i18nProvider = config.i18n
    providers.push({
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        i18nProvider.onLocaleChange(() => bumpLocaleVersion())
      },
    })
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

  return makeEnvironmentProviders(providers)
}
