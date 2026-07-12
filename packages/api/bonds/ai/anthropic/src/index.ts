/**
 * Anthropic ai-anthropic provider for molecule.dev.
 *
 * @remarks
 * Bond this as an AI provider (see `@molecule/api-ai` for the `chat()` streaming loop and the
 * key-server-side / never-blindly-trust-model-output rules). Config: `ANTHROPIC_API_KEY`
 * (SERVER-side only — never shipped to the browser) plus an optional default model id. Drive it
 * through the core `chat()` / `requireProvider()`, NOT the Anthropic SDK directly, so the app
 * stays provider-agnostic and can swap models/providers by changing only the bond.
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: AIProvider | null = null
/**
 * The provider implementation.
 */
export const provider: AIProvider = new Proxy({} as AIProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
