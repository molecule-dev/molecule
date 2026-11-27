/**
 * What the provider components share: setting the services they were given in Svelte context,
 * and a key that changes when one of those services is replaced.
 *
 * @module
 */

import { setChatContext } from '../chat-context.js'
import {
  setAuthContext,
  setEditorContext,
  setHttpContext,
  setI18nContext,
  setLoggerContext,
  setPreviewContext,
  setRouterContext,
  setStateContext,
  setStorageContext,
  setThemeContext,
  setWorkspaceContext,
} from '../context.js'
import type { MoleculeConfig } from '../types.js'

/**
 * Sets each service in `services` in Svelte context, and nothing for one that is absent (unlike
 * `setMoleculeContext`, no state fallback: a single-service provider must not replace the
 * state an outer provider set). Call it during component initialization.
 *
 * @param services - The services to provide.
 */
export function setServiceContexts(services: MoleculeConfig): void {
  if (services.state) setStateContext(services.state)
  if (services.auth) setAuthContext(services.auth)
  if (services.theme) setThemeContext(services.theme)
  if (services.router) setRouterContext(services.router)
  if (services.i18n) setI18nContext(services.i18n)
  if (services.http) setHttpContext(services.http)
  if (services.storage) setStorageContext(services.storage)
  if (services.logger) setLoggerContext(services.logger)
  if (services.chat) setChatContext(services.chat)
  if (services.workspace) setWorkspaceContext(services.workspace)
  if (services.editor) setEditorContext(services.editor)
  if (services.preview) setPreviewContext(services.preview)
}

/** A number per object identity, so a replaced service gives the provided tree a new key. */
const identities = new WeakMap<object, number>()
let nextIdentity = 0

/**
 * The identity number of a service value (0 for an absent one).
 *
 * @param value - A provided service, or `undefined`.
 * @returns The same number for the same object, a new one for another.
 */
function identityOf(value: unknown): number {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return 0
  const known = identities.get(value)
  if (known !== undefined) return known
  nextIdentity += 1
  identities.set(value, nextIdentity)
  return nextIdentity
}

/**
 * A key for `{#key}` that stays the same while every service in `services` is the same object
 * and changes when one is replaced. Svelte sets context once, when a component initializes, so
 * a provider re-creates the tree below it under a new key to hand it the new service; React
 * keeps that tree's state across the change instead.
 *
 * @param services - The services a provider sets.
 * @returns The key.
 */
export function servicesKey(services: MoleculeConfig): string {
  return [
    services.state,
    services.auth,
    services.theme,
    services.router,
    services.i18n,
    services.http,
    services.storage,
    services.logger,
    services.chat,
    services.workspace,
    services.editor,
    services.preview,
  ]
    .map(identityOf)
    .join(':')
}
