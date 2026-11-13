/**
 * MoleculeProvider component for Solid.js framework bindings.
 *
 * @module
 */

import { createComponent, type JSX, type ParentComponent } from 'solid-js'

import {
  AuthContext,
  ChatContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from './context.js'
import { SessionReady } from './session-ready.js'
import type { MoleculeConfig } from './types.js'

/**
 * MoleculeProvider component that provides all molecule services to the component tree.
 *
 * Providers are composed with explicit `createComponent` calls and getter props — the exact
 * shape `vite-plugin-solid` compiles JSX to. Solid evaluates children eagerly, so the
 * getter-`children` chain is what keeps each level lazy: a child component's `useContext`
 * would otherwise read a context whose Provider has not run yet.
 *
 * @param props - Component props containing the molecule config.
 * @returns The nested provider tree wrapping children.
 * @example
 * ```tsx
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { createZustandProvider } from '@molecule/app-state-zustand'
 * import { createJwtAuthClient } from '@molecule/app-auth-jwt'
 *
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       config={{
 *         state: createZustandProvider(),
 *         auth: createJwtAuthClient({ baseUrl: '/api' }),
 *       }}
 *     >
 *       <MyApp />
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 */
export const MoleculeProvider: ParentComponent<{ config: MoleculeConfig }> = (props) => {
  // Build nested providers lazily — children must NOT be evaluated until all
  // providers are in the component tree, otherwise child components that call
  // useContext will find undefined (Solid evaluates children eagerly).
  let render: () => JSX.Element = () => props.children as JSX.Element

  // Wrap the page first so every service provider also wraps the fallback.
  if (props.config.auth && props.config.awaitSession) {
    const inner = render
    render = () =>
      createComponent(SessionReady, {
        get fallback() {
          return props.config.sessionFallback
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.chat) {
    const inner = render
    render = () =>
      createComponent(ChatContext.Provider, {
        get value() {
          return props.config.chat!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.logger) {
    const inner = render
    render = () =>
      createComponent(LoggerContext.Provider, {
        get value() {
          return props.config.logger!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.storage) {
    const inner = render
    render = () =>
      createComponent(StorageContext.Provider, {
        get value() {
          return props.config.storage!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.http) {
    const inner = render
    render = () =>
      createComponent(HttpContext.Provider, {
        get value() {
          return props.config.http!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.i18n) {
    const inner = render
    render = () =>
      createComponent(I18nContext.Provider, {
        get value() {
          return props.config.i18n!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.router) {
    const inner = render
    render = () =>
      createComponent(RouterContext.Provider, {
        get value() {
          return props.config.router!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.theme) {
    const inner = render
    render = () =>
      createComponent(ThemeContext.Provider, {
        get value() {
          return props.config.theme!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.auth) {
    const inner = render
    render = () =>
      createComponent(AuthContext.Provider, {
        get value() {
          return props.config.auth!
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.state) {
    const inner = render
    render = () =>
      createComponent(StateContext.Provider, {
        get value() {
          return props.config.state!
        },
        get children() {
          return inner()
        },
      })
  }

  return render()
}
