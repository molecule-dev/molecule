/**
 * MoleculeProvider component for Solid.js framework bindings.
 *
 * @module
 */

import type { JSX, ParentComponent } from 'solid-js'

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

  if (props.config.logger) {
    const inner = render
    render = () => <LoggerContext.Provider value={props.config.logger!}>{inner()}</LoggerContext.Provider>
  }

  if (props.config.storage) {
    const inner = render
    render = () => <StorageContext.Provider value={props.config.storage!}>{inner()}</StorageContext.Provider>
  }

  if (props.config.http) {
    const inner = render
    render = () => <HttpContext.Provider value={props.config.http!}>{inner()}</HttpContext.Provider>
  }

  if (props.config.i18n) {
    const inner = render
    render = () => <I18nContext.Provider value={props.config.i18n!}>{inner()}</I18nContext.Provider>
  }

  if (props.config.router) {
    const inner = render
    render = () => <RouterContext.Provider value={props.config.router!}>{inner()}</RouterContext.Provider>
  }

  if (props.config.theme) {
    const inner = render
    render = () => <ThemeContext.Provider value={props.config.theme!}>{inner()}</ThemeContext.Provider>
  }

  if (props.config.auth) {
    const inner = render
    render = () => <AuthContext.Provider value={props.config.auth!}>{inner()}</AuthContext.Provider>
  }

  if (props.config.state) {
    const inner = render
    render = () => <StateContext.Provider value={props.config.state!}>{inner()}</StateContext.Provider>
  }

  return render()
}
