/**
 * MoleculeProvider component for Solid.js framework bindings.
 *
 * @module
 */

import { type Context, createComponent, type JSX, type ParentComponent } from 'solid-js'

import {
  AuthContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from './context.js'
import type { MoleculeConfig } from './types.js'

/**
 * MoleculeProvider component that provides all molecule services to the component tree.
 *
 * @param props - Component props containing the molecule config.
 * @returns The nested provider tree wrapping children.
 * @example
 * ```tsx
 * import { MoleculeProvider } from '@molecule/app-solid'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * function App() {
 *   return (
 *     <MoleculeProvider
 *       config={{
 *         state: stateProvider,
 *         auth: createJWTAuthClient({ baseURL: '/api' }),
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
  //
  // Written with `createComponent` (exactly what the Solid compiler emits for
  // `<Ctx.Provider value={v}>{inner()}</Ctx.Provider>`) rather than JSX, so this
  // module is plain JavaScript and loads without the Solid JSX transform.
  let render: () => JSX.Element = () => props.children as JSX.Element

  const wrap = <T,>(ctx: Context<T | undefined>, value: () => T): void => {
    const inner = render
    render = () =>
      createComponent(ctx.Provider, {
        get value() {
          return value()
        },
        get children() {
          return inner()
        },
      })
  }

  if (props.config.logger) wrap(LoggerContext, () => props.config.logger!)
  if (props.config.storage) wrap(StorageContext, () => props.config.storage!)
  if (props.config.http) wrap(HttpContext, () => props.config.http!)
  if (props.config.i18n) wrap(I18nContext, () => props.config.i18n!)
  if (props.config.router) wrap(RouterContext, () => props.config.router!)
  if (props.config.theme) wrap(ThemeContext, () => props.config.theme!)
  if (props.config.auth) wrap(AuthContext, () => props.config.auth!)
  if (props.config.state) wrap(StateContext, () => props.config.state!)

  return render()
}
